import React, { useState, useEffect } from 'react';
import { Plus, Edit2, CheckSquare, Loader2, Save } from 'lucide-react';
import { api } from '../api/client';
import { useI18n } from '../i18n/context';
import { Modal } from '../components/Modal';
import type { Area, ChecklistItem } from '../api/types';

export const AdminAreas: React.FC = () => {
  const { lang, t } = useI18n();

  const [areas, setAreas] = useState<Area[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Area Modal (Create / Edit)
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NA Matrix Modal
  const [naModalOpen, setNaModalOpen] = useState(false);
  const [naArea, setNaArea] = useState<Area | null>(null);
  const [selectedNaIds, setSelectedNaIds] = useState<number[]>([]);
  const [naSaving, setNaSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [areasRes, checklistRes] = await Promise.all([
        api.get<{ areas: Area[] }>('/areas?all=1'),
        api.get<{ items: ChecklistItem[] }>('/checklist?all=1'),
      ]);
      setAreas(areasRes.areas || []);
      setChecklist(checklistRes.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingArea(null);
    setCode('');
    setName('');
    setSortOrder(areas.length * 10 + 10);
    setActive(1);
    setError(null);
    setAreaModalOpen(true);
  };

  const openEditModal = (area: Area) => {
    setEditingArea(area);
    setCode(area.code);
    setName(area.name);
    setSortOrder(area.sort_order);
    setActive(area.active);
    setError(null);
    setAreaModalOpen(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (editingArea) {
        await api.put(`/areas/${editingArea.id}`, {
          code,
          name,
          sort_order: sortOrder,
          active,
        });
      } else {
        await api.post('/areas', {
          code,
          name,
          sort_order: sortOrder,
        });
      }
      setAreaModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openNaModal = async (area: Area) => {
    setNaArea(area);
    try {
      const res = await api.get<{ item_ids: number[] }>(`/areas/${area.id}/na`);
      setSelectedNaIds(res.item_ids || []);
      setNaModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load NA criteria');
    }
  };

  const toggleNaItem = (itemId: number) => {
    if (selectedNaIds.includes(itemId)) {
      setSelectedNaIds(selectedNaIds.filter((id) => id !== itemId));
    } else {
      setSelectedNaIds([...selectedNaIds, itemId]);
    }
  };

  const handleSaveNa = async () => {
    if (!naArea) return;
    setNaSaving(true);
    try {
      await api.put(`/areas/${naArea.id}/na`, { item_ids: selectedNaIds });
      setNaModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update NA items');
    } finally {
      setNaSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('admin_areas_title')}</h1>
          <p className="text-sm text-slate-500 font-medium">
            {areas.length} {t('areas')}
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

      {/* Areas Table */}
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
                  <th className="py-3.5 px-4">{t('area_code')}</th>
                  <th className="py-3.5 px-4">{t('area_name')}</th>
                  <th className="py-3.5 px-4 text-center">{t('sort_order')}</th>
                  <th className="py-3.5 px-4 text-center">{t('status')}</th>
                  <th className="py-3.5 px-4 text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {areas.map((area) => (
                  <tr key={area.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">{area.code}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{area.name}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs">{area.sort_order}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          area.active === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {area.active === 1 ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openNaModal(area)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                        title={t('na_matrix')}
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>NA</span>
                      </button>
                      <button
                        onClick={() => openEditModal(area)}
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

      {/* Modal: Create / Edit Area */}
      <Modal
        isOpen={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
        title={editingArea ? `${t('edit')} - ${editingArea.code}` : t('create')}
      >
        <form onSubmit={handleSaveArea} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('area_code')}
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="e.g. WH, KNI"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              {t('area_name')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="Warehouse"
            />
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

          {editingArea && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="activeAreaCheckbox"
                checked={active === 1}
                onChange={(e) => setActive(e.target.checked ? 1 : 0)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="activeAreaCheckbox" className="text-sm font-semibold text-slate-800">
                {t('active')}
              </label>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAreaModalOpen(false)}
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

      {/* Modal: NA Matrix for Area */}
      <Modal
        isOpen={naModalOpen}
        onClose={() => setNaModalOpen(false)}
        title={`${t('na_matrix')} - ${naArea?.code}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            {t('na_instruction')}
          </p>

          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {checklist.map((item) => {
              const isChecked = selectedNaIds.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleNaItem(item.id)}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-xs space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{item.code}</span>
                      <span className="text-slate-500">
                        ({lang === 'en' ? item.location_en || item.location_vi : item.location_vi})
                      </span>
                      {isChecked && (
                        <span className="font-bold text-[10px] px-1.5 rounded bg-rose-100 text-rose-700">
                          NA
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 line-clamp-2">
                      {lang === 'en' ? item.content_en || item.content_vi : item.content_vi}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNaModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveNa}
              disabled={naSaving}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {naSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{t('save')}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
