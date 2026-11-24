export interface CompressedImageResult {
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  originalSizeBytes: number;
}

function loadImageFromBlob(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image into canvas'));
    };
    img.src = objectUrl;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob conversion failed'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

function drawResized(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): Promise<{ blob: Blob; width: number; height: number }> {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.max(1, Math.round((height * maxDimension) / width));
      width = maxDimension;
    } else {
      width = Math.max(1, Math.round((width * maxDimension) / height));
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error('Could not get 2D canvas context'));
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToJpegBlob(canvas, quality).then((blob) => ({
    blob,
    width: canvas.width,
    height: canvas.height,
  }));
}

/**
 * Compresses an image file/blob to 2K JPEG with dimensions and byte-size metadata.
 * Falls back to tighter quality/dimension presets if output exceeds maxBytes (default 4.8MB)
 * so uploads safely stay below the Worker 5MB ceiling.
 */
export async function compressImageWithMeta(
  file: File | Blob,
  maxDimension = 2048,
  quality = 0.85,
  maxBytes = 4.8 * 1024 * 1024
): Promise<CompressedImageResult> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Selected file is not a supported image');
  }

  const img = await loadImageFromBlob(file);
  const attempts: Array<{ dim: number; q: number }> = [
    { dim: maxDimension, q: quality },
    { dim: maxDimension, q: Math.min(quality, 0.72) },
    { dim: Math.min(maxDimension, 1600), q: 0.65 },
  ];

  let lastResult = await drawResized(img, attempts[0].dim, attempts[0].q);
  for (let i = 1; i < attempts.length && lastResult.blob.size > maxBytes; i++) {
    lastResult = await drawResized(img, attempts[i].dim, attempts[i].q);
  }

  return {
    blob: lastResult.blob,
    width: lastResult.width,
    height: lastResult.height,
    sizeBytes: lastResult.blob.size,
    originalSizeBytes: file.size,
  };
}

/**
 * Rotates an existing image blob by 90, -90, or 180 degrees clockwise on client canvas.
 */
export async function rotateImageBlob(
  blob: Blob,
  degrees: 90 | -90 | 180 = 90,
  quality = 0.88
): Promise<CompressedImageResult> {
  const img = await loadImageFromBlob(blob);
  const srcW = Math.max(1, img.naturalWidth || img.width);
  const srcH = Math.max(1, img.naturalHeight || img.height);
  const swapAxes = degrees === 90 || degrees === -90;

  const canvas = document.createElement('canvas');
  canvas.width = swapAxes ? srcH : srcW;
  canvas.height = swapAxes ? srcW : srcH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D canvas context');
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);

  const rotatedBlob = await canvasToJpegBlob(canvas, quality);
  return {
    blob: rotatedBlob,
    width: canvas.width,
    height: canvas.height,
    sizeBytes: rotatedBlob.size,
    originalSizeBytes: blob.size,
  };
}

/**
 * Client-side canvas image compression.
 * High-definition 2K resolution (maxDimension = 2048px, JPEG quality = 0.85)
 * Produces crisp, clear 2K images (~300-450KB) so fine details (machine labels,
 * Kanban tags, oil leaks, dust) remain clearly readable when zoomed.
 */
export async function compressImage(
  file: File,
  maxDimension = 2048,
  quality = 0.85
): Promise<Blob> {
  const res = await compressImageWithMeta(file, maxDimension, quality);
  return res.blob;
}

/**
 * Convert an image file (PNG/JPG/SVG/WEBP) to a base64 Data URL resized to fit within maxDimension (default 256px).
 * Keeps PNG format to preserve alpha transparency for company logos.
 */
export async function fileToLogoDataUrl(file: File, maxDimension = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D canvas context'));
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
