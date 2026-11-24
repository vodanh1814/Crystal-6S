import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, Loader2, ZoomIn } from 'lucide-react';
import { useI18n } from '../i18n/context';
import type { Photo } from '../api/types';
import { PhotoApprovalModal } from './PhotoApprovalModal';
import { Lightbox, type LightboxPhoto } from './Lightbox';
import { MAX_PHOTOS_PER_KIND } from '../lib/auditEntry';

interface PhotoUploadProps {
  photos: Photo[];
  kind: 'before' | 'after';
  canUpload: boolean;
  canDelete?: (photo: Photo) => boolean;
  onUpload: (blob: Blob) => Promise<void>;
  onUploadBatch?: (
    blobs: Blob[],
    onProgress?: (done: number, total: number) => void
  ) => Promise<void>;
  onDelete?: (photoId: number) => Promise<void>;
  onPhotoClick?: (photo: Photo, photosOfKind: Photo[]) => void;
  contextLabel?: string;
  maxPhotos?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  kind,
  canUpload,
  canDelete,
  onUpload,
  onUploadBatch,
  onDelete,
  onPhotoClick,
  contextLabel,
  maxPhotos = MAX_PHOTOS_PER_KIND,
}) => {
  const { t } = useI18n();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPhotos = photos.filter((p) => p.kind === kind);
  const reachedMax = filteredPhotos.length >= maxPhotos;

  const openApprovalWithFiles = (files: FileList | File[]) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return;
    setPendingFiles(arr);
    setApprovalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      openApprovalWithFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleApproveBatch = async (
    blobs: Blob[],
    onProgress?: (done: number, total: number) => void
  ) => {
    if (onUploadBatch) {
      await onUploadBatch(blobs, onProgress);
      return;
    }
    const total = blobs.length;
    for (let i = 0; i < total; i++) {
      await onUpload(blobs[i]);
      onProgress?.(i + 1, total);
    }
  };

  const handleDeleteClick = async (photo: Photo) => {
    if (!onDelete || deletingId !== null) return;
    if (!window.confirm(t('confirm_delete_photo'))) return;
    try {
      setDeletingId(photo.id);
      await onDelete(photo.id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenPhoto = (photo: Photo, index: number) => {
    if (onPhotoClick) {
      onPhotoClick(photo, filteredPhotos);
      return;
    }
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxPhotos: LightboxPhoto[] = filteredPhotos.map((p) => ({
    id: p.id,
    kind: p.kind,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-slate-800">
          {kind === 'before' ? t('before_photos') : t('after_photos')} ({filteredPhotos.length}/
          {maxPhotos})
        </label>
        {reachedMax && (
          <span className="text-xs text-amber-600 font-medium">{t('max_6_photos')}</span>
        )}
      </div>

      {/* Photos Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {filteredPhotos.map((photo, idx) => (
          <div
            key={photo.id}
            className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
          >
            <img
              src={`/api/photos/${photo.id}`}
              alt={photo.kind}
              onClick={() => handleOpenPhoto(photo, idx)}
              className="w-full h-full object-cover cursor-pointer"
              loading="lazy"
            />
            {/* Always accessible action overlay on mobile touch, hover-enhanced on desktop */}
            <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-slate-950/75 via-slate-950/35 to-transparent flex items-center justify-between gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => handleOpenPhoto(photo, idx)}
                className="p-1.5 min-w-[32px] min-h-[32px] rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white border border-white/20 flex items-center justify-center cursor-pointer"
                title={t('btn_zoom_preview')}
                aria-label={t('btn_zoom_preview')}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {canDelete && canDelete(photo) && onDelete && (
                <button
                  type="button"
                  disabled={deletingId === photo.id}
                  onClick={() => handleDeleteClick(photo)}
                  className="p-1.5 min-w-[32px] min-h-[32px] rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 flex items-center justify-center cursor-pointer disabled:opacity-50"
                  title={t('delete')}
                  aria-label={t('delete')}
                >
                  {deletingId === photo.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Upload Trigger Tile (opens Preview & Approval Modal) */}
        {canUpload && !reachedMax && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer?.files?.length) {
                openApprovalWithFiles(e.dataTransfer.files);
              }
            }}
            className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 p-2 transition-colors ${
              dragActive
                ? 'border-sky-500 bg-sky-50'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50'
            }`}
          >
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="p-2 min-w-[38px] min-h-[38px] rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer flex items-center justify-center"
                title={t('btn_camera_capture')}
                aria-label={t('btn_camera_capture')}
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 min-w-[38px] min-h-[38px] rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer flex items-center justify-center"
                title={t('btn_gallery_select')}
                aria-label={t('btn_gallery_select')}
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">
              {t('take_photo_or_upload')}
            </span>

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
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      {canUpload && !reachedMax && (
        <p className="text-[11px] text-slate-400">{t('inline_photo_preview_hint')}</p>
      )}

      {/* Pre-Upload Preview & Approval Modal */}
      <PhotoApprovalModal
        isOpen={approvalOpen}
        onClose={() => {
          setApprovalOpen(false);
          setPendingFiles([]);
        }}
        kind={kind}
        existingCount={filteredPhotos.length}
        maxPhotos={maxPhotos}
        initialFiles={pendingFiles}
        contextLabel={contextLabel}
        onApproveUpload={handleApproveBatch}
      />

      {/* Unified Lightbox (when parent does not override onPhotoClick) */}
      {!onPhotoClick && (
        <Lightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
};
