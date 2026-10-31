import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

export interface LightboxPhoto {
  id: number;
  kind?: 'before' | 'after';
  area_code?: string;
  item_code?: string;
  description?: string;
  finding_id?: number;
}

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  photos: LightboxPhoto[];
  currentIndex: number;
  onNavigate?: (newIndex: number) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  isOpen,
  onClose,
  photos,
  currentIndex,
  onNavigate,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onNavigate && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && onNavigate && currentIndex < photos.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onClose, onNavigate]);

  if (!isOpen || photos.length === 0) return null;

  const current = photos[currentIndex] || photos[0];
  const photoUrl = `/api/photos/${current.id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div
        className="absolute top-3 left-3 right-3 flex items-center justify-between text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {current.kind && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                current.kind === 'before'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              }`}
            >
              {current.kind === 'before' ? 'Trước (Before)' : 'Sau cải thiện (After)'}
            </span>
          )}
          {current.area_code && (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200">
              {current.area_code}
            </span>
          )}
          {current.item_code && (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-blue-400">
              {current.item_code}
            </span>
          )}
          {photos.length > 1 && (
            <span className="text-xs text-slate-400 font-mono hidden sm:inline-block ml-2">
              {currentIndex + 1} / {photos.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {current.finding_id && (
            <Link
              to={`/findings/${current.finding_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Xem chi tiết lỗi"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chi tiết lỗi</span>
            </Link>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Prev button */}
      {photos.length > 1 && onNavigate && currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white transition z-10 cursor-pointer border border-slate-700 hover:border-blue-500 shadow-xl"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next button */}
      {photos.length > 1 && onNavigate && currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white transition z-10 cursor-pointer border border-slate-700 hover:border-blue-500 shadow-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Image Container */}
      <div
        className="max-w-[94vw] max-h-[86vh] flex flex-col items-center justify-center p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photoUrl}
          alt={current.description || 'Finding Photo'}
          className="max-w-full max-h-[78vh] rounded-xl object-contain shadow-2xl border border-white/10"
        />

        {current.description && (
          <div className="mt-3 px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200 text-xs text-center max-w-2xl line-clamp-2">
            {current.description}
          </div>
        )}
      </div>
    </div>
  );
};
