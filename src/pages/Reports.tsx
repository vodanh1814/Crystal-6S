import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Loader2,
  Calendar,
  FileSpreadsheet,
  Upload,
  Check,
  ClipboardPaste,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { Modal } from '../components/Modal';
import { exportWeeklyReportToExcel, exportMonthlyReportToExcel } from '../lib/excelExport';
import {
  getVietnamCurrentMonth,
  getVietnamCurrentYear,
  getMonthShortName,
  MONTH_SHORT_NAMES,
} from '../lib/date';
import type { Area } from '../api/types';

export const Reports: React.FC = () => {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const currentMonth = getVietnamCurrentMonth();
  const currentYear = getVietnamCurrentYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Data
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);

  // Historical Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [historicalInputs, setHistoricalInputs] = useState<{ [key: string]: string }>({});
  const [savingHistorical, setSavingHistorical] = useState(false);
  const [pasteBoxText, setPasteBoxText] = useState('');
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'weekly') {
        const res = await api.get<any>(`/reports/weekly?month=${selectedMonth}`);
        setWeeklyData(res);
      } else {
        const res = await api.get<any>(`/reports/monthly?year=${selectedYear}`);
        setMonthlyData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Open Historical Import Modal and pre-populate inputs
  const openHistoricalModal = () => {
    const initialInputs: { [key: string]: string } = {};
    if (monthlyData && monthlyData.matrix) {
      for (const row of monthlyData.matrix) {
        for (const m of ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']) {
          const key = `${row.area_id}_${m}`;
          const histVal = monthlyData.historical_scores?.[key];
          if (histVal !== undefined && histVal !== null) {
            initialInputs[key] = String(histVal);
          } else {
            initialInputs[key] = '';
          }
        }
      }
    }
    setHistoricalInputs(initialInputs);
    setPasteBoxText('');
    setPasteNotice(null);
    setImportModalOpen(true);
  };

  // Helper to parse clean score from string/excel
  const parseCleanScore = (valStr: string): string => {
    const cleaned = valStr.trim().replace(/%/g, '').replace(/,/g, '.');
    if (!cleaned) return '';
    const num = parseFloat(cleaned);
    if (isNaN(num)) return '';
    // Auto convert ratio (e.g. 0.965 from Excel percentage cell -> 96.5)
    if (num > 0 && num <= 1) {
      return (Math.round(num * 1000) / 10).toFixed(1);
    }
    return (Math.round(num * 10) / 10).toFixed(1);
  };

  // Paste a 2D grid of values into historicalInputs starting at [startRow, startCol]
  const applyClipboardMatrix = (
    text: string,
    startAreaIndex = 0,
    startMonthIndex = 0
  ) => {
    if (!monthlyData?.matrix) return;
    const areas = monthlyData.matrix;
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    // Split text into lines and tabs
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split('\t'));

    if (lines.length === 0 || lines[0].length === 0) return;

    const nextInputs = { ...historicalInputs };
    let filledCount = 0;

    for (let r = 0; r < lines.length; r++) {
      const areaIdx = startAreaIndex + r;
      if (areaIdx >= areas.length) break;
      const area = areas[areaIdx];

      const rowCols = lines[r];
      for (let c = 0; c < rowCols.length; c++) {
        const monthIdx = startMonthIndex + c;
        if (monthIdx >= months.length) break;
        const m = months[monthIdx];

        const rawVal = rowCols[c];
        const parsed = parseCleanScore(rawVal);
        const key = `${area.area_id}_${m}`;
        nextInputs[key] = parsed;
        if (parsed) filledCount++;
      }
    }

    setHistoricalInputs(nextInputs);
    setPasteNotice(`Đã điền ${filledCount} ô từ dữ liệu Excel.`);
  };

  // Handle cell paste
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    areaIndex: number,
    monthIndex: number
  ) => {
    const text = e.clipboardData.getData('text/plain');
    if (text && (text.includes('\t') || text.includes('\n'))) {
      e.preventDefault();
      applyClipboardMatrix(text, areaIndex, monthIndex);
    }
  };

  // Save Historical Scores to Backend
  const handleSaveHistoricalScores = async () => {
    if (!monthlyData?.matrix) return;
    setSavingHistorical(true);

    try {
      const entries: { area_id: number; month: string; score: number | null }[] = [];
      const areas = monthlyData.matrix;
      const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

      for (const area of areas) {
        for (const m of months) {
          const key = `${area.area_id}_${m}`;
          const val = historicalInputs[key];
          if (val === undefined || val === null || val.trim() === '') {
            entries.push({ area_id: area.area_id, month: m, score: null });
          } else {
            const num = parseFloat(val);
            if (!isNaN(num)) {
              entries.push({ area_id: area.area_id, month: m, score: num });
            } else {
              entries.push({ area_id: area.area_id, month: m, score: null });
            }
          }
        }
      }

      await api.put('/reports/historical-monthly', {
        year: selectedYear,
        entries,
      });

      setImportModalOpen(false);
      await fetchReportData();
    } catch (err: any) {
      alert(err.message || 'Failed to save historical scores');
    } finally {
      setSavingHistorical(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      if (tab === 'weekly' && weeklyData) {
        await exportWeeklyReportToExcel(
          weeklyData.month,
          weeklyData.target,
          weeklyData.weeks,
          weeklyData.matrix
        );
      } else if (tab === 'monthly' && monthlyData) {
        await exportMonthlyReportToExcel(
          monthlyData.year,
          monthlyData.target,
          monthlyData.months,
          monthlyData.matrix
        );
      }
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const renderCell = (
    score: number | null | undefined,
    target: number,
    source?: 'audited' | 'historical' | null
  ) => {
    if (score === null || score === undefined) {
      return <span className="text-slate-300">-</span>;
    }
    const isPass = score >= target;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
          isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
        }`}
        title={source === 'historical' ? 'Điểm nhập lịch sử' : 'Điểm audit tuần'}
      >
        <span>{score.toFixed(1)}%</span>
        {source === 'historical' && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Lịch sử" />
        )}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('reports')}</h1>
          <p className="text-sm text-slate-500 font-medium">
            {tab === 'weekly' ? t('weekly_report') : t('monthly_report')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tabs */}
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1">
            <button
              onClick={() => setTab('weekly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'weekly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('weekly_report')}
            </button>
            <button
              onClick={() => setTab('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'monthly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('monthly_report')}
            </button>
          </div>

          {/* Month/Year Picker */}
          {tab === 'weekly' ? (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          {/* Import Historical Scores (Admin only on Monthly view) */}
          {isAdmin && tab === 'monthly' && (
            <button
              onClick={openHistoricalModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Nhập điểm lịch sử các tháng từ Excel"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t('import_historical_scores')}</span>
            </button>
          )}

          {/* Excel Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>{t('export_excel')}</span>
          </button>
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : tab === 'weekly' && weeklyData ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">{t('area_column')}</th>
                  {weeklyData.weeks.map((w: any) => (
                    <th key={w.label} className="py-3 px-3 text-center whitespace-nowrap">
                      {w.label}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center bg-slate-100/60 font-black">{t('month_avg_column')}</th>
                  <th className="py-3 px-4 text-center">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeklyData.matrix.map((row: any) => (
                  <tr key={row.area_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {row.area_code}
                      <span className="text-xs font-normal text-slate-400 ml-1.5 hidden sm:inline">
                        {row.area_name}
                      </span>
                    </td>
                    {weeklyData.weeks.map((w: any) => (
                      <td key={w.label} className="py-3 px-3 text-center whitespace-nowrap">
                        {renderCell(row.weeks[w.label]?.score, weeklyData.target)}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center bg-slate-50 font-black whitespace-nowrap">
                      {renderCell(row.month_avg, weeklyData.target)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {row.passed === true ? (
                        <span className="text-xs font-bold text-emerald-600 px-2 py-0.5 rounded bg-emerald-50">
                          {t('pass')}
                        </span>
                      ) : row.passed === false ? (
                        <span className="text-xs font-bold text-rose-600 px-2 py-0.5 rounded bg-rose-50">
                          {t('fail')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'monthly' && monthlyData ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">{t('area_column')}</th>
                  {monthlyData.months.map((m: string) => (
                    <th key={m} className="py-3 px-2 text-center whitespace-nowrap">
                      {getMonthShortName(m)}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center bg-slate-100/60 font-black">{t('year_avg_column')}</th>
                  <th className="py-3 px-4 text-center">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyData.matrix.map((row: any) => (
                  <tr key={row.area_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {row.area_code}
                      <span className="text-xs font-normal text-slate-400 ml-1.5 hidden sm:inline">
                        {row.area_name}
                      </span>
                    </td>
                    {monthlyData.months.map((m: string) => (
                      <td key={m} className="py-3 px-2 text-center whitespace-nowrap">
                        {renderCell(row.months[m], monthlyData.target, row.sources?.[m])}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center bg-slate-50 font-black whitespace-nowrap">
                      {renderCell(row.year_avg, monthlyData.target)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {row.passed === true ? (
                        <span className="text-xs font-bold text-emerald-600 px-2 py-0.5 rounded bg-emerald-50">
                          {t('pass')}
                        </span>
                      ) : row.passed === false ? (
                        <span className="text-xs font-bold text-rose-600 px-2 py-0.5 rounded bg-rose-50">
                          {t('fail')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Historical Monthly Score Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title={t('import_historical_title', { year: selectedYear })}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t('import_historical_desc')}</span>
            </div>
            <p className="text-slate-600 pl-5">
              {t('import_paste_excel_help')}
            </p>
          </div>

          {/* Quick Paste box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                <span>Dán nhanh từ Excel (Paste from Clipboard)</span>
              </label>
              {pasteNotice && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {pasteNotice}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={pasteBoxText}
                onChange={(e) => setPasteBoxText(e.target.value)}
                placeholder={t('paste_here_placeholder')}
                className="flex-1 p-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (pasteBoxText.trim()) {
                    applyClipboardMatrix(pasteBoxText, 0, 0);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm self-end transition cursor-pointer"
              >
                Áp dụng
              </button>
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <div className="max-h-[50vh] overflow-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-2.5 px-3 bg-slate-100 whitespace-nowrap">Khu vực</th>
                  {MONTH_SHORT_NAMES.map(
                    (m, idx) => (
                      <th key={idx} className="py-2.5 px-2 text-center whitespace-nowrap min-w-[58px]">
                        {m}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {monthlyData?.matrix?.map((row: any, rIdx: number) => (
                  <tr key={row.area_id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap bg-slate-50/60">
                      {row.area_code}
                    </td>
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(
                      (m, cIdx) => {
                        const key = `${row.area_id}_${m}`;
                        const val = historicalInputs[key] || '';
                        return (
                          <td key={m} className="p-1 text-center">
                            <input
                              type="text"
                              value={val}
                              placeholder="-"
                              onPaste={(e) => handleCellPaste(e, rIdx, cIdx)}
                              onChange={(e) => {
                                const next = { ...historicalInputs };
                                next[key] = e.target.value;
                                setHistoricalInputs(next);
                              }}
                              className="w-full py-1 text-center font-mono font-bold text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                        );
                      }
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-[11px] text-slate-400 italic">
              Để trống nếu muốn xóa điểm lịch sử của tháng đó.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveHistoricalScores}
                disabled={savingHistorical}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingHistorical && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{t('save')}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
