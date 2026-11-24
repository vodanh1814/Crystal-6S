import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  RotateCw,
  ZoomIn,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { compressImageWithMeta, rotateImageBlob } from '../lib/imageCompression';
import { formatFileSize, getRemainingPhotoSlots, MAX_PHOTOS_PER_KIND } from '../lib/auditEntry';
import { useI18n } from '../i18n/context';
import { Modal } from './Modal';
import { Lightbox, type LightboxPhoto } from './Lightbox';

export interface StagedPhoto {
  localId: string;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  originalSizeBytes: number;
  name?: string;
}

/**
 * Compresses selected image files into staged preview objects with ObjectURLs.
 * Caller is responsible for revoking ObjectURLs via `revokeStagedPhotos` when discarded/unmounted.
 */
export async function createStagedPhotos(
  files: FileList | File[],
  maxCount: number
): Promise<{ staged: StagedPhoto[]; skippedInvalid: number; truncatedCount: number }> {
  const arr = Array.from(files || []);
  const imageFiles = arr.filter((f) => !f.type || f.type.startsWith('image/'));
  const skippedInvalid = arr.length - imageFiles.length;
  const limit = Math.max(0, maxCount);
  const selected = imageFiles.slice(0, limit);
  const truncatedCount = Math.max(0, imageFiles.length - selected.length);

  const staged: StagedPhoto[] = [];
  try {
    for (const file of selected) {
      const res = await compressImageWithMeta(file);
      const previewUrl = URL.createObjectURL(res.blob);
      staged.push({
        localId:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        blob: res.blob,
        previewUrl,
        width: res.width,
        height: res.height,
        sizeBytes: res.sizeBytes,
        originalSizeBytes: res.originalSizeBytes,
        name: file.name,
      });
    }
  } catch (err) {
    revokeStagedPhotos(staged);
    throw err;
  }

  return { staged, skippedInvalid, truncatedCount };
}

/**
 * Revokes ObjectURLs held by staged photo entries to avoid browser memory leaks.
 */
export function revokeStagedPhotos(items: readonly StagedPhoto[]): void {
  for (const item of items) {
    if (item.previewUrl) {
      try {
        URL.revokeObjectURL(item.previewUrl);
      } catch {}
    }
  }
}

interface StagedPhotoTrayProps {
  stagedPhotos: StagedPhoto[];
  onChange: React.Dispatch<React.SetStateAction<StagedPhoto[]>>;
  kind: 'before' | 'after';
  existingCount?: number;
  maxPhotos?: number;
  disabled?: boolean;
  areaCode?: string;
  itemCode?: string;
  compact?: boolean;
}

/**
 * Reusable staged photo tray with Camera, Gallery (multi-select), Drag & Drop, Ctrl+V Paste,
 * 2K Lightbox zoom, 90° clockwise rotation, and per-item removal before approval/upload.
 */
export const StagedPhotoTray: React.FC<StagedPhotoTrayProps> = ({
  stagedPhotos,
  onChange,
  kind,
  existingCount = 0,
  maxPhotos = MAX_PHOTOS_PER_KIND,
  disabled = false,
  areaCode,
  itemCode,
  compact = false,
}) => {
  const { t } = useI18n();
  const [compressing, setCompressing] = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const remainingSlots = getRemainingPhotoSlots(existingCount, stagedPhotos.length, maxPhotos);

  const ingestFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return;
      const incoming = Array.from(files || []);
      if (incoming.length === 0) return;

      const slots = getRemainingPhotoSlots(existingCount, stagedPhotos.length, maxPhotos);
      if (slots <= 0) {
        setLocalError(t('photo_slots_full', { max: maxPhotos }));
        return;
      }

      setLocalError(null);
      try {
        setCompressing(true);
        const { staged, skippedInvalid, truncatedCount } = await createStagedPhotos(incoming, slots);
        if (!mountedRef.current) {
          revokeStagedPhotos(staged);
          return;
        }
        if (staged.length > 0) {
          onChange((prev) => [...prev, ...staged]);
        }
        if (skippedInvalid > 0) {
          setLocalError(t('photo_invalid_file'));
        } else if (truncatedCount > 0) {
          setLocalError(t('photo_slots_full', { max: maxPhotos }));
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setLocalError(err?.message || t('error'));
        }
      } finally {
        if (mountedRef.current) {
          setCompressing(false);
        }
      }
    },
    [disabled, existingCount, stagedPhotos.length, maxPhotos, onChange, t]
  );

  const handleRemove = (localId: string) => {
    if (disabled) return;
    onChange((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) revokeStagedPhotos([target]);
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const handleRotate = async (photo: StagedPhoto) => {
    if (disabled || rotatingId) return;
    try {
      setRotatingId(photo.localId);
      setLocalError(null);
      const rotated = await rotateImageBlob(photo.blob, 90);
      const nextUrl = URL.createObjectURL(rotated.blob);
      if (!mountedRef.current) {
        URL.revokeObjectURL(nextUrl);
        return;
      }
      let applied = false;
      onChange((prev) => {
        const exists = prev.some((p) => p.localId === photo.localId);
        if (!exists) return prev;
        applied = true;
        return prev.map((p) => {
          if (p.localId !== photo.localId) return p;
          revokeStagedPhotos([p]);
          return {
            ...p,
            blob: rotated.blob,
            previewUrl: nextUrl,
            width: rotated.width,
            height: rotated.height,
            sizeBytes: rotated.sizeBytes,
          };
        });
      });
      if (!applied) {
        URL.revokeObjectURL(nextUrl);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setLocalError(err?.message || t('error'));
      }
    } finally {
      if (mountedRef.current) {
        setRotatingId(null);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData?.items || [])) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void ingestFiles(files);
    }
  };

  const lightboxPhotos: LightboxPhoto[] = stagedPhotos.map((p) => ({
    src: p.previewUrl,
    kind,
    area_code: areaCode,
    item_code: itemCode,
    metaLabel: `${p.width}×${p.height} · ${formatFileSize(p.sizeBytes)}`,
    description: p.name,
  }));

  return (
    <div className="space-y-2.5" onPaste={handlePaste}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700">
          {t('staged_photos_count', { n: existingCount + stagedPhotos.length, max: maxPhotos })}
        </span>
        {remainingSlots > 0 && !disabled && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={compressing}
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t('btn_camera_capture')}</span>
            </button>
            <button
              type="button"
              disabled={compressing}
              onClick={() => galleryInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{t('btn_gallery_select')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Dropzone & Preview Grid */}
      <div
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled && e.dataTransfer?.files?.length) {
            void ingestFiles(e.dataTransfer.files);
          }
        }}
        tabIndex={0}
        className={`rounded-2xl border-2 border-dashed p-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          dragActive
            ? 'border-sky-500 bg-sky-50/70'
            : 'border-slate-300 bg-slate-50/70'
        }`}
      >
        {compressing && (
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('compressing_photos')}</span>
          </div>
        )}

        {stagedPhotos.length === 0 ? (
          <div className="py-4 text-center space-y-1">
            <p className="text-xs font-medium text-slate-500">{t('staged_empty_prompt')}</p>
            <p className="text-[11px] text-slate-400">{t('drop_or_paste_hint')}</p>
          </div>
        ) : (
          <div
            className={`grid gap-2.5 ${
              compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {stagedPhotos.map((p, idx) => (
              <div
                key={p.localId}
                className="relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs flex flex-col"
              >
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                  <img
                    src={p.previewUrl}
                    alt={p.name || `Preview ${idx + 1}`}
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                    className="w-full h-full object-cover cursor-pointer"
                  />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/75 text-white text-[10px] font-mono">
                    {formatFileSize(p.sizeBytes)}
                  </span>
                </div>

                {/* Action strip always visible for touch usability */}
                <div className="p-1.5 flex items-center justify-between gap-1 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                    title={t('btn_zoom_preview')}
                    aria-label={t('btn_zoom_preview')}
                    className="flex-1 min-h-[34px] rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 flex items-center justify-center cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || rotatingId === p.localId}
                    onClick={() => handleRotate(p)}
                    title={t('btn_rotate_90')}
                    aria-label={t('btn_rotate_90')}
                    className="flex-1 min-h-[34px] rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    {rotatingId === p.localId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCw className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleRemove(p.localId)}
                    title={t('btn_discard_photo')}
                    aria-label={t('btn_discard_photo')}
                    className="flex-1 min-h-[34px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {localError && (
        <div role="status" aria-live="polite" className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void ingestFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void ingestFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={lightboxPhotos}
        currentIndex={lightboxIndex}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
};

interface PhotoApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  kind: 'before' | 'after';
  existingCount: number;
  maxPhotos?: number;
  initialFiles?: File[];
  contextLabel?: string;
  onApproveUpload: (
    blobs: Blob[],
    onProgress?: (done: number, total: number) => void
  ) => Promise<void>;
}

/**
 * Unified pre-upload photo staging, sharpness inspection, rotation, and approval modal.
 */
export const PhotoApprovalModal: React.FC<PhotoApprovalModalProps> = ({
  isOpen,
  onClose,
  kind,
  existingCount,
  maxPhotos = MAX_PHOTOS_PER_KIND,
  initialFiles,
  contextLabel,
  onApproveUpload,
}) => {
  const { t } = useI18n();
  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const stagedRef = useRef<StagedPhoto[]>([]);
  const wasOpenRef = useRef(false);
  const sessionTokenRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);

  // Revoke any lingering ObjectURLs when modal unmounts
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionTokenRef.current += 1;
      revokeStagedPhotos(stagedRef.current);
    };
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[], replace = false) => {
      const list = Array.from(files || []);
      if (list.length === 0) return;

      const currentCount = replace ? 0 : stagedRef.current.length;
      const slots = getRemainingPhotoSlots(existingCount, currentCount, maxPhotos);
      if (slots <= 0) {
        setErrorMsg(t('photo_slots_full', { max: maxPhotos }));
        return;
      }

      const token = sessionTokenRef.current;
      setErrorMsg(null);
      try {
        setCompressing(true);
        const { staged: nextItems, skippedInvalid, truncatedCount } = await createStagedPhotos(
          list,
          slots
        );
        if (!mountedRef.current || !wasOpenRef.current || sessionTokenRef.current !== token) {
          revokeStagedPhotos(nextItems);
          return;
        }
        if (replace) {
          revokeStagedPhotos(stagedRef.current);
          setStaged(nextItems);
          setSelectedIndex(0);
        } else if (nextItems.length > 0) {
          setStaged((prev) => {
            const combined = [...prev, ...nextItems];
            setSelectedIndex(prev.length);
            return combined;
          });
        }
        if (skippedInvalid > 0) {
          setErrorMsg(t('photo_invalid_file'));
        } else if (truncatedCount > 0) {
          setErrorMsg(t('photo_slots_full', { max: maxPhotos }));
        }
      } catch (err: any) {
        if (mountedRef.current && wasOpenRef.current && sessionTokenRef.current === token) {
          setErrorMsg(err?.message || t('error'));
        }
      } finally {
        if (mountedRef.current) {
          setCompressing(false);
        }
      }
    },
    [existingCount, maxPhotos, t]
  );

  // Reset & ingest initial files only when modal transitions closed -> open
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      sessionTokenRef.current += 1;
      revokeStagedPhotos(stagedRef.current);
      setStaged([]);
      setSelectedIndex(0);
      setErrorMsg(null);
      setUploading(false);
      setUploadDone(0);
      setUploadTotal(0);
      setLightboxOpen(false);
      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      sessionTokenRef.current += 1;
      if (initialFiles && initialFiles.length > 0) {
        void addFiles(initialFiles, true);
      }
    }
  }, [isOpen, initialFiles, addFiles]);

  const handleCloseSafe = () => {
    if (uploading || lightboxOpen) return;
    onClose();
  };

  const handleRemove = (localId: string) => {
    if (uploading) return;
    setStaged((prev) => {
      const idx = prev.findIndex((p) => p.localId === localId);
      if (idx >= 0) revokeStagedPhotos([prev[idx]]);
      const next = prev.filter((p) => p.localId !== localId);
      setSelectedIndex((cur) => Math.max(0, Math.min(cur, next.length - 1)));
      return next;
    });
  };

  const handleRotate = async (photo: StagedPhoto) => {
    if (uploading || rotatingId) return;
    const token = sessionTokenRef.current;
    try {
      setRotatingId(photo.localId);
      setErrorMsg(null);
      const rotated = await rotateImageBlob(photo.blob, 90);
      const nextUrl = URL.createObjectURL(rotated.blob);
      if (!mountedRef.current || !wasOpenRef.current || sessionTokenRef.current !== token) {
        URL.revokeObjectURL(nextUrl);
        return;
      }
      let applied = false;
      setStaged((prev) => {
        if (!prev.some((p) => p.localId === photo.localId)) return prev;
        applied = true;
        return prev.map((p) => {
          if (p.localId !== photo.localId) return p;
          revokeStagedPhotos([p]);
          return {
            ...p,
            blob: rotated.blob,
            previewUrl: nextUrl,
            width: rotated.width,
            height: rotated.height,
            sizeBytes: rotated.sizeBytes,
          };
        });
      });
      if (!applied) {
        URL.revokeObjectURL(nextUrl);
      }
    } catch (err: any) {
      if (mountedRef.current && sessionTokenRef.current === token) {
        setErrorMsg(err?.message || t('error'));
      }
    } finally {
      if (mountedRef.current) {
        setRotatingId(null);
      }
    }
  };

  const handleApproveAndUpload = async () => {
    if (uploading || staged.length === 0) return;
    setErrorMsg(null);
    setUploading(true);
    setUploadDone(0);
    setUploadTotal(staged.length);
    let succeededCount = 0;
    try {
      await onApproveUpload(
        staged.map((s) => s.blob),
        (done, total) => {
          succeededCount = done;
          setUploadDone(done);
          setUploadTotal(total);
        }
      );
      revokeStagedPhotos(staged);
      setStaged([]);
      onClose();
    } catch (err: any) {
      if (succeededCount > 0) {
        setStaged((prev) => {
          const uploadedSlice = prev.slice(0, succeededCount);
          revokeStagedPhotos(uploadedSlice);
          return prev.slice(succeededCount);
        });
        setSelectedIndex(0);
      }
      setErrorMsg(err?.message || t('photo_upload_partial_error'));
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (uploading) return;
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData?.items || [])) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void addFiles(files, false);
    }
  };

  const activePhoto = staged[selectedIndex] || staged[0] || null;
  const remainingSlots = getRemainingPhotoSlots(existingCount, staged.length, maxPhotos);
  const lightboxPhotos: LightboxPhoto[] = staged.map((p) => ({
    src: p.previewUrl,
    kind,
    metaLabel: `${p.width}×${p.height} · ${formatFileSize(p.sizeBytes)}`,
    description: p.name,
  }));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleCloseSafe}
        title={t('photo_approval_title')}
        maxWidth="xl"
      >
        <div
          className="space-y-4"
          onPaste={handlePaste}
          onDragOver={(e) => {
            if (uploading) return;
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (!uploading && e.dataTransfer?.files?.length) {
              void addFiles(e.dataTransfer.files, false);
            }
          }}
        >
          {/* Context & Subtitle */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5">
              <p className="text-slate-600 font-medium">{t('photo_approval_subtitle')}</p>
              {contextLabel && (
                <p className="font-bold text-sky-700">{contextLabel}</p>
              )}
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                kind === 'before'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {kind === 'before' ? t('lightbox_before') : t('lightbox_after')} ·{' '}
              {existingCount + staged.length}/{maxPhotos}
            </span>
          </div>

          {/* Large Preview Stage */}
          <div
            className={`relative rounded-2xl border-2 transition-colors overflow-hidden bg-slate-950/90 min-h-[240px] sm:min-h-[320px] flex flex-col items-center justify-center ${
              dragActive ? 'border-sky-400 bg-sky-950/40' : 'border-slate-200'
            }`}
          >
            {compressing && (
              <div className="absolute inset-0 z-10 bg-slate-950/70 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="w-7 h-7 animate-spin text-sky-400" />
                <span className="text-xs font-bold">{t('compressing_photos')}</span>
              </div>
            )}

            {activePhoto ? (
              <>
                <img
                  src={activePhoto.previewUrl}
                  alt={activePhoto.name || 'Preview'}
                  onClick={() => setLightboxOpen(true)}
                  className="max-h-[46vh] w-full object-contain cursor-zoom-in select-none"
                />
                {/* Top-right metadata & quick actions over stage */}
                <div className="w-full px-3 py-2 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-bold">
                      {selectedIndex + 1}/{staged.length}
                    </span>
                    <span>
                      {activePhoto.width}×{activePhoto.height}px · {formatFileSize(activePhoto.sizeBytes)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t('btn_zoom_preview')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={uploading || rotatingId === activePhoto.localId}
                      onClick={() => handleRotate(activePhoto)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-40"
                    >
                      {rotatingId === activePhoto.localId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{t('btn_rotate_90')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => handleRemove(activePhoto.localId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('btn_discard_photo')}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center space-y-3 text-slate-300">
                <ImageIcon className="w-10 h-10 mx-auto text-slate-500" />
                <p className="text-sm font-semibold">{t('staged_empty_prompt')}</p>
                <p className="text-xs text-slate-400">{t('drop_or_paste_hint')}</p>
              </div>
            )}
          </div>

          {/* Thumbnail Strip + Add More Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {staged.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.localId}
                  className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    isSelected ? 'border-sky-500 ring-2 ring-sky-500/40' : 'border-slate-300 opacity-80 hover:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className="w-full h-full block cursor-pointer"
                    aria-label={`Select preview ${idx + 1}`}
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.name || `Thumb ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => handleRemove(item.localId)}
                    aria-label={t('btn_discard_photo')}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {remainingSlots > 0 && !uploading && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={compressing}
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-16 px-3 rounded-xl border border-dashed border-sky-400 bg-sky-50/70 hover:bg-sky-100 text-sky-700 text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t('btn_camera_capture')}</span>
                </button>
                <button
                  type="button"
                  disabled={compressing}
                  onClick={() => galleryInputRef.current?.click()}
                  className="h-16 px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{t('btn_gallery_select')}</span>
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div
              role="status"
              aria-live="polite"
              className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div role="status" aria-live="polite" className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-sky-700">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('uploading_progress', { done: uploadDone, total: uploadTotal })}
                </span>
                <span>{uploadTotal > 0 ? Math.round((uploadDone / uploadTotal) * 100) : 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-200"
                  style={{
                    width: `${uploadTotal > 0 ? Math.round((uploadDone / uploadTotal) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 hidden sm:inline">{t('drop_or_paste_hint')}</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={uploading}
                onClick={handleCloseSafe}
                className="px-4 py-2 min-h-[42px] rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={uploading || compressing || staged.length === 0}
                onClick={handleApproveAndUpload}
                className="px-4 py-2 min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {staged.length === 1
                    ? t('btn_approve_upload_one')
                    : t('btn_approve_upload', { n: staged.length })}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Hidden Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files, false);
            e.target.value = '';
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files, false);
            e.target.value = '';
          }}
        />
      </Modal>

      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={lightboxPhotos}
        currentIndex={selectedIndex}
        onNavigate={setSelectedIndex}
      />
    </>
  );
};
