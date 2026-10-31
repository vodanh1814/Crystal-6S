import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useI18n } from '../i18n/context';
import { Modal } from '../components/Modal';
import type { ChecklistItem } from '../api/types';

export const AdminChecklist: React.FC = () => {
  const { lang, t } = useI18n();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [sGroup, setSGroup] = useState(1);
  const [locationVi, setLocationVi] = useState('');
  const [locationEn, setLocationEn] = useState('');
  const [contentVi, setContentVi] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [penalty, setPenalty] = useState(1);
  const [escalating, setEscalating] = useState(1);
  const [sortOrder, setSortOrder] = useState(10);
  const [active, setActive] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ items: ChecklistItem[] }>('/checklist?all=1');
      setItems(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setCode('');
    setSGroup(1);
    setLocationVi('');
    setLocationEn('');
    setContentVi('');
    setContentEn('');
    setPenalty(1);
    setEscalating(1);
    setSortOrder(items.length * 10 + 10);
    setActive(1);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: ChecklistItem) => {
    setEditingItem(item);
    setCode(item.code);
    setSGroup(item.s_group);
    setLocationVi(item.location_vi);
    setLocationEn(item.location_en);
    setContentVi(item.content_vi);
    setContentEn(item.content_en);
    setPenalty(item.penalty);
    setEscalating(item.escalating);
    setSortOrder(item.sort_order);
    setActive(item.active);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        code,
        s_group: sGroup,
        location_vi: locationVi,
        location_en: locationEn,
        content_vi: contentVi,
        content_en: contentEn,
        penalty,
        escalating,
        sort_order: sortOrder,
        active,
      };

      if (editingItem) {
        await api.put(`/checklist/${editingItem.id}`, payload);
      } else {
        await api.post('/checklist', payload);
      }
      setModalOpen(false);
      await fetchChecklist();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('admin_checklist_title')}</h1>
          <p className="text-sm text-slate-500 font-medium">
            {items.length} {t('checklist')}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm shadow-blue-600/20 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('create')}</span>
        </button>
      </div>

      {/* Checklist Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">{t('checklist_code')}</th>
                  <th className="py-3.5 px-4">{t('s_group')}</th>
                  <th className="py-3.5 px-4">{t('location')}</th>
                  <th className="py-3.5 px-4">{t('content_header')}</th>
                  <th className="py-3.5 px-3 text-center">{t('penalty')}</th>
                  <th className="py-3.5 px-3 text-center">{t('escalating')}</th>
                  <th className="py-3.5 px-3 text-center">{t('status')}</th>
                  <th className="py-3.5 px-4 text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">{item.code}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-xs">S{item.s_group}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {lang === 'en' ? item.location_en || item.location_vi : item.location_vi}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-800 max-w-md">
                      {lang === 'en' ? item.content_en || item.content_vi : item.content_vi}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-rose-600 whitespace-nowrap">
                      -{item.penalty}
                    </td>
                    <td className="py-3.5 px-3 text-center text-xs font-semibold whitespace-nowrap">
                      {item.escalating ? (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {t('escalating_yes')}
                        </span>
                      ) : (
                        <span className="text-slate-400">{t('escalating_no')}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          item.active === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.active === 1 ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                        title={t('edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{t('edit')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Checklist Item */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} - ${editingItem.code}` : t('create')}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('checklist_code')}
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                placeholder="S1.1"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('s_group')} (1-5)
              </label>
              <select
                value={sGroup}
                onChange={(e) => setSGroup(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value={1}>S1 - Sort</option>
                <option value={2}>S2 - Set in order</option>
                <option value={3}>S3 - Shine</option>
                <option value={4}>S4 - Standardize</option>
                <option value={5}>S5 - Sustain</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('location_vi_label')}
              </label>
              <input
                type="text"
                value={locationVi}
                onChange={(e) => setLocationVi(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('location_en_label')}
              </label>
              <input
                type="text"
                value={locationEn}
                onChange={(e) => setLocationEn(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('content_vi')}
            </label>
            <textarea
              required
              rows={2}
              value={contentVi}
              onChange={(e) => setContentVi(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('content_en')}
            </label>
            <textarea
              rows={2}
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('base_penalty')}
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={penalty}
                onChange={(e) => setPenalty(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('escalating')}
              </label>
              <select
                value={escalating}
                onChange={(e) => setEscalating(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              >
                <option value={1}>{t('escalating_yes')}</option>
                <option value={0}>{t('escalating_no')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('sort_order')}
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>

          {editingItem && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="activeItemCheckbox"
                checked={active === 1}
                onChange={(e) => setActive(e.target.checked ? 1 : 0)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="activeItemCheckbox" className="text-sm font-semibold text-slate-800">
                {t('active')}
              </label>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
              <span>{t('save')}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
