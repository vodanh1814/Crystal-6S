import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ArrowRight,
  List,
  LayoutGrid,
  Columns3,
  ZoomIn,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { StatusBadge } from '../components/StatusBadge';
import { Lightbox, type LightboxPhoto } from '../components/Lightbox';
import type { Finding, Area, Photo } from '../api/types';

export const FindingsList: React.FC = () => {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const mobilePillCls = 'min-h-[40px] sm:min-h-0';

  const [findings, setFindings] = useState<Finding[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'list' | 'gallery' | 'kanban'
  const [viewMode, setViewMode] = useState<'list' | 'gallery' | 'kanban'>('list');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<LightboxPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Filters
  const areaFilter = searchParams.get('area_id') || '';
  const statusFilter = searchParams.get('status') || '';
  const monthFilter = searchParams.get('month') || '';
  const repeatFilter = searchParams.get('repeat') === '1';
  const overdueFilter = searchParams.get('overdue') === '1';

  useEffect(() => {
    api.get<{ areas: Area[] }>('/areas?all=1')
      .then((res) => setAreas(res.areas || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (areaFilter) params.append('area_id', areaFilter);
    if (statusFilter) params.append('status', statusFilter);
    if (monthFilter) params.append('month', monthFilter);
    if (repeatFilter) params.append('repeat', '1');
    if (overdueFilter) params.append('overdue', '1');

    api.get<{ findings: Finding[] }>(`/findings?${params.toString()}`)
      .then((res) => setFindings(res.findings || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [areaFilter, statusFilter, monthFilter, repeatFilter, overdueFilter]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const openLightboxForFinding = (
    finding: Finding,
    selectedPhotoId: number,
    allPhotosForFinding: Photo[]
  ) => {
    const lbPhotos: LightboxPhoto[] = allPhotosForFinding.map((p) => ({
      id: p.id,
      kind: p.kind,
      area_code: finding.area_code,
      item_code: finding.item_code,
      description: finding.description || (lang === 'en' ? finding.content_en : finding.content_vi),
      finding_id: finding.id,
    }));

    const idx = lbPhotos.findIndex((p) => p.id === selectedPhotoId);
    setLightboxPhotos(lbPhotos);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  };

  const selectedAreaObj = useMemo(
    () => areas.find((a) => String(a.id) === areaFilter),
    [areas, areaFilter]
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Top Bar: Back to Dashboard & Guest Notice */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>{t('back_to_dashboard')}</span>
        </Link>
        {!user && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('guest_view_mode')}</span>
          </div>
        )}
      </div>

      {/* Page Title & View Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('findings_page_title')}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {selectedAreaObj ? (
              <span className="text-blue-600 font-bold">
                [{selectedAreaObj.code} - {selectedAreaObj.name}] ·{' '}
              </span>
            ) : null}
            {findings.length} {t('findings')}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="inline-flex flex-wrap items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 self-start sm:self-auto gap-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>{t('view_list_with_photos')}</span>
          </button>
          <button
            onClick={() => setViewMode('gallery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'gallery'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{t('view_photo_gallery')}</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns3 className="w-4 h-4" />
            <span>Kanban</span>
          </button>
        </div>
      </div>

      {/* Bento KPI Summary Strip */}
      {(() => {
        const openCount = findings.filter((f) => f.status === 'open').length;
        const fixedCount = findings.filter((f) => f.status === 'fixed').length;
        const closedCount = findings.filter((f) => f.status === 'closed' || f.status === 'carried').length;
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bento-card p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {t('findings')}
              </span>
              <div className="text-2xl font-black font-mono tabular-nums text-slate-900">
                {findings.length}
              </div>
            </div>
            <div className="bento-card p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">
                  {t('status_open')}
                </span>
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-rose-600">
                {openCount}
              </div>
            </div>
            <div className="bento-card p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                  {t('status_fixed')}
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-amber-600">
                {fixedCount}
              </div>
            </div>
            <div className="bento-card p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                  {t('status_closed')}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-emerald-600">
                {closedCount}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Top Area Quick Pills Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>{t('quick_area_pills')}</span>
          {areaFilter && (
            <button
              onClick={() => updateFilter('area_id', '')}
              className="text-blue-600 hover:underline normal-case font-semibold"
            >
              {t('all_areas')}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => updateFilter('area_id', '')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${mobilePillCls} ${
              !areaFilter
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('all')}
          </button>

          {areas.map((a) => {
            const isSelected = String(a.id) === areaFilter;
            return (
              <button
                key={a.id}
                onClick={() => updateFilter('area_id', isSelected ? '' : String(a.id))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${mobilePillCls} ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title={a.name}
              >
                {a.code}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
          <Filter className="w-4 h-4" />
          <span>{t('filter')}:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('all')} {t('status')}</option>
          <option value="open">{t('status_open')}</option>
          <option value="fixed">{t('status_fixed')}</option>
          <option value="closed">{t('status_closed')}</option>
        </select>

        <input
          type="month"
          value={monthFilter}
          onChange={(e) => updateFilter('month', e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={() => updateFilter('overdue', overdueFilter ? '' : '1')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${mobilePillCls} ${
            overdueFilter
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          {t('count_overdue_findings')}
        </button>

        <button
          onClick={() => updateFilter('repeat', repeatFilter ? '' : '1')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${mobilePillCls} ${
            repeatFilter
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          {t('count_not_improved')}
        </button>

        {(areaFilter || statusFilter || monthFilter || repeatFilter || overdueFilter) && (
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="text-xs font-semibold text-rose-600 hover:underline ml-auto cursor-pointer"
          >
            {t('all')}
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : findings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          {t('noData')}
        </div>
      ) : viewMode === 'list' ? (
        /* VIEW 1: LIST WITH PHOTOS */
        <div className="space-y-3">
          {findings.map((finding) => {
            const allPhotos = finding.photos || [];
            const beforePhotos = allPhotos.filter((p) => p.kind === 'before');
            const afterPhotos = allPhotos.filter((p) => p.kind === 'after');

            return (
              <div
                key={finding.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Info details */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {finding.area_code}
                    </span>
                    <span className="text-xs font-bold text-slate-600">{finding.item_code}</span>
                    <StatusBadge status={finding.status} type="finding" />
                    {finding.repeat_level > 1 && (
                      <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                        {t('repeat_week', { n: finding.repeat_level })}
                      </span>
                    )}
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      -{finding.applied_penalty}{t('pts_unit')}
                    </span>
                  </div>

                  <Link
                    to={`/findings/${finding.id}`}
                    className="block text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {lang === 'en' ? finding.content_en || finding.content_vi : finding.content_vi}
                  </Link>

                  {finding.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 italic">
                      {finding.description}
                    </p>
                  )}

                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <span>
                      {t('week')} {finding.iso_week} ({finding.audit_date})
                    </span>
                    <span>·</span>
                    <span>{t('due_date')}: {finding.due_date}</span>
                    {finding.fix_note && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold line-clamp-1">
                          Fix: {finding.fix_note}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Before & After Thumbnails side-by-side */}
                <div className="shrink-0 flex items-center gap-3 self-start md:self-center">
                  <div className="flex items-center gap-2">
                    {/* Before thumbnail */}
                    {beforePhotos.length > 0 ? (
                      <div
                        onClick={() => openLightboxForFinding(finding, beforePhotos[0].id, allPhotos)}
                        className="group/img relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:border-rose-400 transition"
                        title={t('click_to_zoom')}
                      >
                        <img
                          src={`/api/photos/${beforePhotos[0].id}`}
                          alt="Before"
                          className="w-full h-full object-cover group-hover/img:scale-105 transition"
                          loading="lazy"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-rose-700/85 text-[9px] font-bold text-white text-center py-0.5 uppercase tracking-wider">
                          Before
                        </span>
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-[10px] text-slate-400 bg-slate-50">
                        <ImageIcon className="w-4 h-4 text-slate-300" />
                        <span>No Before</span>
                      </div>
                    )}

                    {/* After thumbnail */}
                    {afterPhotos.length > 0 ? (
                      <div
                        onClick={() => openLightboxForFinding(finding, afterPhotos[0].id, allPhotos)}
                        className="group/img relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:border-emerald-400 transition"
                        title={t('click_to_zoom')}
                      >
                        <img
                          src={`/api/photos/${afterPhotos[0].id}`}
                          alt="After"
                          className="w-full h-full object-cover group-hover/img:scale-105 transition"
                          loading="lazy"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-700/85 text-[9px] font-bold text-white text-center py-0.5 uppercase tracking-wider">
                          After
                        </span>
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-[10px] text-slate-400 bg-slate-50 text-center px-1">
                        <Clock className="w-4 h-4 text-slate-300" />
                        <span>{t('pending_after')}</span>
                      </div>
                    )}
                  </div>

                  {/* Action link */}
                  <Link
                    to={`/findings/${finding.id}`}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title={t('finding_detail')}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'gallery' ? (
        /* VIEW 2: PHOTO GALLERY VIEW (BEFORE & AFTER SIDE-BY-SIDE CARDS) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {findings.map((finding) => {
            const allPhotos = finding.photos || [];
            const beforePhotos = allPhotos.filter((p) => p.kind === 'before');
            const afterPhotos = allPhotos.filter((p) => p.kind === 'after');

            return (
              <div
                key={finding.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all group"
              >
                {/* Header of card */}
                <div className="p-4 border-b border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {finding.area_code}
                      </span>
                      <span className="text-xs font-bold text-slate-600">{finding.item_code}</span>
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        -{finding.applied_penalty}{t('pts_unit')}
                      </span>
                    </div>
                    <StatusBadge status={finding.status} type="finding" />
                  </div>

                  <p className="text-xs font-bold text-slate-900 line-clamp-2">
                    {lang === 'en' ? finding.content_en || finding.content_vi : finding.content_vi}
                  </p>
                </div>

                {/* 50/50 BEFORE & AFTER VISUAL CONTAINER */}
                <div className="grid grid-cols-2 gap-1 p-2 bg-slate-900/5">
                  {/* BEFORE PHOTO */}
                  <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    {beforePhotos.length > 0 ? (
                      <div
                        onClick={() => openLightboxForFinding(finding, beforePhotos[0].id, allPhotos)}
                        className="w-full h-full cursor-pointer relative group/thumb"
                        title={t('click_to_zoom')}
                      >
                        <img
                          src={`/api/photos/${beforePhotos[0].id}`}
                          alt="Before"
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition"
                          loading="lazy"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[10px] font-black uppercase tracking-wider shadow">
                          {t('before_label')}
                        </span>
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center text-white">
                          <ZoomIn className="w-5 h-5" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                        <ImageIcon className="w-5 h-5 mb-1 text-slate-300" />
                        <span>{t('no_photo')}</span>
                      </div>
                    )}
                  </div>

                  {/* AFTER PHOTO */}
                  <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    {afterPhotos.length > 0 ? (
                      <div
                        onClick={() => openLightboxForFinding(finding, afterPhotos[0].id, allPhotos)}
                        className="w-full h-full cursor-pointer relative group/thumb"
                        title={t('click_to_zoom')}
                      >
                        <img
                          src={`/api/photos/${afterPhotos[0].id}`}
                          alt="After"
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition"
                          loading="lazy"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-black uppercase tracking-wider shadow">
                          {t('after_label')}
                        </span>
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center text-white">
                          <ZoomIn className="w-5 h-5" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-50 text-slate-400">
                        <Clock className="w-5 h-5 mb-1 text-amber-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-slate-600">
                          {t('no_after_photo_yet')}
                        </span>
                        <span className="text-[10px] text-slate-400">{t('in_progress')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer of card */}
                <div className="p-4 space-y-2.5">
                  {finding.fix_note ? (
                    <div className="text-xs bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-100 line-clamp-2">
                      <strong className="font-bold">{t('fix_label')}</strong> {finding.fix_note}
                    </div>
                  ) : finding.description ? (
                    <p className="text-xs text-slate-500 line-clamp-1 italic">
                      {finding.description}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>
                      {t('week')} {finding.iso_week} ({finding.audit_date})
                    </span>
                    <Link
                      to={`/findings/${finding.id}`}
                      className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700"
                    >
                      <span>{t('edit')} / Xem</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW 3: 3-COLUMN KANBAN BOARD */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {[
            {
              key: 'open',
              title: t('status_open'),
              dotCls: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
              badgeCls: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
              borderAccent: 'border-t-2 border-t-rose-500',
              items: findings.filter((f) => f.status === 'open'),
            },
            {
              key: 'fixed',
              title: t('status_fixed'),
              dotCls: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
              badgeCls: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
              borderAccent: 'border-t-2 border-t-amber-500',
              items: findings.filter((f) => f.status === 'fixed'),
            },
            {
              key: 'closed',
              title: t('status_closed'),
              dotCls: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
              badgeCls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
              borderAccent: 'border-t-2 border-t-emerald-500',
              items: findings.filter((f) => f.status === 'closed' || f.status === 'carried'),
            },
          ].map((col) => (
            <div
              key={col.key}
              className={`bento-card bg-white rounded-2xl border border-slate-200 overflow-hidden ${col.borderAccent}`}
            >
              {/* Column Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dotCls}`} />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 truncate">
                    {col.title}
                  </h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-black font-mono tabular-nums border shrink-0 ${col.badgeCls}`}
                >
                  {col.items.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="p-3 space-y-2.5 max-h-[70vh] overflow-y-auto">
                {col.items.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    {t('noData')}
                  </div>
                ) : (
                  col.items.map((finding) => {
                    const allPhotos = finding.photos || [];
                    const previewPhoto = allPhotos.find((p) => p.kind === 'before') || allPhotos[0];
                    return (
                      <div
                        key={finding.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-blue-400 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
                              {finding.area_code}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-500 truncate">
                              {finding.item_code}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-black font-mono tabular-nums text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                              -{finding.applied_penalty}{t('pts_unit')}
                            </span>
                            <StatusBadge status={finding.status} type="finding" />
                          </div>
                        </div>

                        <Link
                          to={`/findings/${finding.id}`}
                          className="block text-xs font-bold text-slate-900 hover:text-blue-600 line-clamp-2 transition-colors"
                        >
                          {lang === 'en' ? finding.content_en || finding.content_vi : finding.content_vi}
                        </Link>

                        {finding.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                            {finding.description}
                          </p>
                        )}

                        {previewPhoto && (
                          <button
                            type="button"
                            onClick={() => openLightboxForFinding(finding, previewPhoto.id, allPhotos)}
                            className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group/thumb cursor-pointer block"
                            title={t('click_to_zoom')}
                          >
                            <img
                              src={`/api/photos/${previewPhoto.id}`}
                              alt={finding.item_code || 'Finding'}
                              className="w-full h-full object-cover group-hover/thumb:scale-105 transition"
                              loading="lazy"
                            />
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[9px] font-bold uppercase tracking-wider">
                              {allPhotos.length}
                            </span>
                            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center text-white">
                              <ZoomIn className="w-4 h-4" />
                            </div>
                          </button>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70 text-[10px] text-slate-400">
                          <span className="font-mono tabular-nums truncate">
                            {t('week')} {finding.iso_week}
                            {finding.due_date ? ` · ${t('due_date')}: ${finding.due_date}` : ''}
                          </span>
                          <Link
                            to={`/findings/${finding.id}`}
                            className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 shrink-0"
                          >
                            <span>{t('edit')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2K Fullscreen Lightbox Modal */}
      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={lightboxPhotos}
        currentIndex={lightboxIndex}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  );
};
