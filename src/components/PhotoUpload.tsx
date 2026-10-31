import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, Loader2, ZoomIn } from 'lucide-react';
import { compressImage } from '../lib/imageCompression';
import { useI18n } from '../i18n/context';
import type { Photo } from '../api/types';

interface PhotoUploadProps {
  photos: Photo[];
  kind: 'before' | 'after';
  canUpload: boolean;
  canDelete?: (photo: Photo) => boolean;
  onUpload: (blob: Blob) => Promise<void>;
  onDelete?: (photoId: number) => Promise<void>;
  maxPhotos?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  kind,
  canUpload,
  canDelete,
  onUpload,
  onDelete,
  maxPhotos = 6,
}) => {
  const { t } = useI18n();
  const [compressing, setCompressing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressing(true);
      const compressedBlob = await compressImage(file);
      await onUpload(compressedBlob);
    } catch (err: any) {
      alert(err.message || 'Failed to process and upload image');
    } finally {
      setCompressing(false);
      if (e.target) e.target.value = '';
    }
  };

  const filteredPhotos = photos.filter((p) => p.kind === kind);
  const reachedMax = filteredPhotos.length >= maxPhotos;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800">
          {kind === 'before' ? t('before_photos') : t('after_photos')} ({filteredPhotos.length}/{maxPhotos})
        </label>
        {reachedMax && (
          <span className="text-xs text-amber-600 font-medium">{t('max_6_photos')}</span>
        )}
      </div>

      {/* Photos Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
          >
            <img
              src={`/api/photos/${photo.id}`}
              alt={photo.kind}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedImage(`/api/photos/${photo.id}`)}
                className="p-1.5 rounded-full bg-white/80 text-slate-700 hover:bg-white"
                title="View full"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {canDelete && canDelete(photo) && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(photo.id)}
                  className="p-1.5 rounded-full bg-rose-600/80 text-white hover:bg-rose-600"
                  title={t('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Upload Buttons */}
        {canUpload && !reachedMax && (
          <div className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 flex flex-col items-center justify-center gap-1.5 p-2 transition-colors">
            {compressing ? (
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            ) : (
              <>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Camera"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title="Gallery"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">
                  {t('take_photo_or_upload')}
                </span>
              </>
            )}

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
};
