import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, Filter, Calendar, Loader2, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { ScoreBadge } from '../components/ScoreBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { getVietnamToday } from '../lib/date';
import type { Audit, Area } from '../api/types';

export const AuditsList: React.FC = () => {
  const { user, isAdmin, canAudit } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [audits, setAudits] = useState<Audit[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // New Audit Modal (Plant-wide weekly audit: audit_date + optional note)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(() => getVietnamToday());
  const [modalNote, setModalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ areas: Area[] }>('/areas')
      .then((res) => setAreas(res.areas || []))
      .catch((err) => console.error(err));
  }, []);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get<{ audits: Audit[] }>(`/audits?${params.toString()}`);
      setAudits(res.audits || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [selectedMonth, selectedStatus]);

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      const res = await api.post<{ audit: Audit }>('/audits', {
        audit_date: modalDate,
        note: modalNote,
      });
      setIsModalOpen(false);
      setModalNote('');
      navigate(`/audits/${res.audit.id}`);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create audit');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if user is admin or has at least one auditor assignment
  const auditableAreas = areas.filter((a) => canAudit(a.id));
  const canCreateNewAudit = isAdmin || auditableAreas.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('audits')}</h1>
          <p className="text-sm text-slate-500 font-medium">
            {t('plant_audit_week', { week: 'ISO', date: 'Plant-wide' }).replace(' ({date})', '')} · 1 {t('week').toLowerCase()} / 1 {t('appTitle')}
          </p>
        </div>

        {canCreateNewAudit && (
          <button
            onClick={() => {
              setModalDate(getVietnamToday());
              setModalNote('');
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm shadow-blue-600/20 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('new_audit')}</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
          <Filter className="w-4 h-4" />
          <span>{t('filter')}:</span>
        </div>

        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('all')} {t('status')}</option>
          <option value="draft">{t('status_draft')}</option>
          <option value="submitted">{t('status_submitted')}</option>
        </select>

        {(selectedMonth || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedMonth('');
              setSelectedStatus('');
            }}
            className="text-xs font-semibold text-rose-600 hover:underline ml-auto"
          >
            {t('all')}
          </button>
        )}
      </div>

      {/* Audits Grid / Cards */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : audits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          {t('noData')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audits.map((audit) => (
            <Link
              key={audit.id}
              to={`/audits/${audit.id}`}
              className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {audit.iso_year}-W{audit.iso_week < 10 ? `0${audit.iso_week}` : audit.iso_week}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {audit.month}
                    </span>
                  </div>
                  <StatusBadge status={audit.status} type="audit" />
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {t('audit_date')}: <strong className="text-slate-700">{audit.audit_date}</strong>
                    </span>
                  </div>
                  <div className="truncate">
                    Auditor: <span className="font-semibold text-slate-700">{audit.auditor_name}</span>
                  </div>
                  {audit.note && (
                    <div className="truncate text-slate-400 italic">
                      "{audit.note}"
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t('plant_score_label')}
                  </div>
                  <ScoreBadge score={audit.score} showStatusText />
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t('penalty')}
                  </div>
                  <div className="text-sm font-black text-rose-600">
                    -{audit.total_penalty || 0}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Plant-wide Weekly Audit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('new_audit')}>
        <form onSubmit={handleCreateAudit} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {modalError}
            </div>
          )}

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>1 Đợt kiểm tra / tuần cho toàn nhà máy:</strong> Sau khi tạo, bạn có thể ghi nhận lỗi theo từng khu vực và nhập bảng số lỗi ngoại vi (BOD, Customer, IE). Điểm tuần mặc định khởi tạo 100% cho tất cả khu vực.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('audit_date')}
            </label>
            <input
              type="date"
              required
              max={getVietnamToday()}
              value={modalDate}
              onChange={(e) => setModalDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('note')} ({t('role_viewer').toLowerCase()})
            </label>
            <textarea
              rows={2}
              value={modalNote}
              onChange={(e) => setModalNote(e.target.value)}
              placeholder={t('audit_note_placeholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t('create')}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
