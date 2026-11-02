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
  AlertTriangle,
} from 'lucide-react';
import {
  downloadHistoricalTemplate,
  parseHistoricalExcelFile,
} from '../lib/excelHistorical';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { Modal } from '../components/Modal';
import {
  exportWeeklyReportToExcel,
  exportMonthlyReportToExcel,
  exportRemediationReportToExcel,
} from '../lib/excelExport';
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
  const [tab, setTab] = useState<'weekly' | 'monthly' | 'remediation'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'monthly' || params.get('import') === '1') return 'monthly';
    if (params.get('tab') === 'remediation') return 'remediation';
    return 'weekly';
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const currentMonth = getVietnamCurrentMonth();
  const currentYear = getVietnamCurrentYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [remediationMonthFilter, setRemediationMonthFilter] = useState<string>(''); // '' = all year, or 'YYYY-MM'

  // Data
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [remediationData, setRemediationData] = useState<any>(null);

  // Historical Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [historicalInputs, setHistoricalInputs] = useState<{ [key: string]: string }>({});
  const [savingHistorical, setSavingHistorical] = useState(false);
  const [pasteBoxText, setPasteBoxText] = useState('');
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    success: boolean;
    message: string;
    unmatched?: string[];
  } | null>(null);
  const hasAutoOpened = React.useRef(false);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'weekly') {
        const res = await api.get<any>(`/reports/weekly?month=${selectedMonth}`);
        setWeeklyData(res);
      } else if (tab === 'monthly') {
        const res = await api.get<any>(`/reports/monthly?year=${selectedYear}`);
        setMonthlyData(res);
      } else if (tab === 'remediation') {
        const q = remediationMonthFilter
          ? `/reports/remediation?year=${selectedYear}&month=${remediationMonthFilter}`
          : `/reports/remediation?year=${selectedYear}`;
        const res = await api.get<any>(q);
        setRemediationData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, selectedMonth, selectedYear, remediationMonthFilter]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Check URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'monthly' || params.get('import') === '1') {
      setTab('monthly');
    }
  }, []);

  // Auto-open modal if URL requested import=1 (Admin only)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      (params.get('import') === '1' || params.get('import_historical') === '1') &&
      isAdmin &&
      monthlyData &&
      monthlyData.matrix &&
      !hasAutoOpened.current
    ) {
      hasAutoOpened.current = true;
      openHistoricalModal();
    }
  }, [monthlyData, isAdmin]);

  // Open Historical Import Modal and pre-populate inputs (Admin only)
  const openHistoricalModal = () => {
    if (!isAdmin) return;
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
    setUploadFeedback(null);
    setShowPasteBox(false);
    setImportModalOpen(true);
  };

  const handleDownloadTemplate = async () => {
    if (!monthlyData?.matrix) return;
    try {
      const areas = monthlyData.matrix.map((row: any) => ({
        id: row.area_id,
        code: row.area_code,
        name: row.area_name || row.area_code,
      }));
      await downloadHistoricalTemplate(areas, selectedYear, monthlyData.historical_scores);
    } catch (err: any) {
      alert(err.message || t('template_download_error'));
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !monthlyData?.matrix) return;

    setParsingFile(true);
    setUploadFeedback(null);
    try {
      const areas = monthlyData.matrix.map((row: any) => ({
        id: row.area_id,
        code: row.area_code,
        name: row.area_name || row.area_code,
      }));

      const result = await parseHistoricalExcelFile(file, areas);

      const nextInputs = { ...historicalInputs };
      for (const entry of result.entries) {
        const key = `${entry.area_id}_${entry.month}`;
        nextInputs[key] = String(entry.score);
      }

      setHistoricalInputs(nextInputs);

      const msg = t('upload_excel_success', {
        areas: result.matchedAreas.length,
        months: result.monthsFound.length,
        total: result.totalScoresFound,
      });

      setUploadFeedback({
        success: true,
        message: msg,
        unmatched: result.unmatchedLabels,
      });
    } catch (err: any) {
      setUploadFeedback({
        success: false,
        message: err.message || t('excel_file_invalid'),
      });
    } finally {
      setParsingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
    setPasteNotice(t('excel_paste_cells_filled', { count: filledCount }));
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
      } else if (tab === 'remediation' && remediationData) {
        await exportRemediationReportToExcel(
          remediationData.year,
          remediationData.month,
          remediationData.summary,
          remediationData.by_area || []
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
        title={source === 'historical' ? t('historical_score_tooltip') : t('weekly_score_tooltip')}
      >
        <span>{score.toFixed(1)}%</span>
        {source === 'historical' && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title={t('historical_badge')} />
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
            {tab === 'weekly'
              ? t('weekly_report')
              : tab === 'monthly'
              ? t('monthly_report')
              : t('remediation_report')}
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
            <button
              onClick={() => setTab('remediation')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'remediation'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('remediation_report')}
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
            <div className="inline-flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => {
                  const yr = parseInt(e.target.value, 10);
                  setSelectedYear(yr);
                  if (remediationMonthFilter) {
                    setRemediationMonthFilter(`${yr}-${remediationMonthFilter.slice(5, 7)}`);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {tab === 'remediation' && (
                <select
                  value={remediationMonthFilter}
                  onChange={(e) => setRemediationMonthFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {t('all_year_option')} ({selectedYear})
                  </option>
                  {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(
                    (m, idx) => (
                      <option key={m} value={`${selectedYear}-${m}`}>
                        {MONTH_SHORT_NAMES[idx]} {selectedYear}
                      </option>
                    )
                  )}
                </select>
              )}
            </div>
          )}

          {/* Import Historical Scores (Admin only on Monthly view) */}
          {isAdmin && tab === 'monthly' && (
            <button
              onClick={openHistoricalModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title={t('import_excel_tooltip')}
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
        ) : tab === 'remediation' && remediationData ? (
          <div className="p-5 space-y-6">
            {/* 4 Summary KPI Cards for Remediation Effectiveness */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  {t('on_time_closure_rate')}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-emerald-700">
                    {remediationData.summary?.on_time_rate_pct !== null &&
                    remediationData.summary?.on_time_rate_pct !== undefined
                      ? `${remediationData.summary.on_time_rate_pct}%`
                      : '-'}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {remediationData.summary?.on_time_findings || 0} /{' '}
                    {(remediationData.summary?.resolved_findings || 0) +
                      (remediationData.summary?.overdue_findings || 0)}{' '}
                    {t('on_time_short')}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 flex flex-col justify-between">
                <div className="text-xs font-bold text-sky-800 uppercase tracking-wider">
                  {t('avg_remediation_time')}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-sky-700">
                    {remediationData.summary?.avg_remediation_days !== null &&
                    remediationData.summary?.avg_remediation_days !== undefined
                      ? `${remediationData.summary.avg_remediation_days} ${t('days_unit')}`
                      : '-'}
                  </span>
                  <span className="text-xs font-semibold text-sky-700">
                    {t('std_deadline')}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-col justify-between">
                <div className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                  {t('recurrence_rate')}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-purple-700">
                    {remediationData.summary?.repeat_rate_pct ?? 0}%
                  </span>
                  <span className="text-xs font-semibold text-purple-700">
                    {remediationData.summary?.repeat_findings || 0} /{' '}
                    {remediationData.summary?.total_findings || 0} {t('repeat_findings_label')}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t('resolution_rate')}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {remediationData.summary?.resolution_rate_pct !== null &&
                    remediationData.summary?.resolution_rate_pct !== undefined
                      ? `${remediationData.summary.resolution_rate_pct}%`
                      : '-'}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {remediationData.summary?.resolved_findings || 0} /{' '}
                    {remediationData.summary?.total_findings || 0} {t('status_fixed')}
                  </span>
                </div>
              </div>
            </div>

            {/* Per-Area Remediation Effectiveness Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">{t('area_column')}</th>
                    <th className="py-3 px-3 text-center">{t('total_findings_col')}</th>
                    <th className="py-3 px-3 text-center">{t('resolved_col')}</th>
                    <th className="py-3 px-3 text-center">{t('on_time_col')}</th>
                    <th className="py-3 px-3 text-center">{t('overdue_col')}</th>
                    <th className="py-3 px-3 text-center">{t('mttr_col')}</th>
                    <th className="py-3 px-3 text-center">{t('repeat_rate_col')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(remediationData.by_area || []).map((row: any) => {
                    const onTimePct = row.on_time_rate_pct;
                    const mttr = row.avg_remediation_days;
                    const repeatPct = row.repeat_rate_pct || 0;

                    return (
                      <tr key={row.area_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {row.area_code}
                          <span className="text-xs font-normal text-slate-400 ml-1.5 hidden sm:inline">
                            {row.area_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                          {row.total_findings}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-700 font-bold">
                          {row.resolved_findings}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {onTimePct !== null && onTimePct !== undefined ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                                onTimePct >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : onTimePct >= 75
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {onTimePct}% ({row.on_time_findings})
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          {row.overdue_findings > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-xs font-bold">
                              {row.overdue_findings}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                          {mttr !== null && mttr !== undefined ? (
                            <span
                              className={`text-xs font-bold ${
                                mttr <= 4
                                  ? 'text-emerald-700'
                                  : mttr <= 7
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {mttr} {t('days_unit')}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                          {row.total_findings > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                repeatPct === 0
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : repeatPct <= 15
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {repeatPct}% ({row.repeat_findings})
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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

          {/* Action Toolbar: Download Template, Upload Excel, Toggle Manual Paste */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                title={t('download_template_excel')}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{t('download_template_excel')}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileSelected}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsingFile}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {parsingFile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{parsingFile ? t('parsing_excel') : t('upload_excel_btn')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPasteBox(!showPasteBox)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
              <span>{showPasteBox ? t('hide_paste_box') : t('show_paste_box')}</span>
            </button>
          </div>

          {/* Feedback banner if upload succeeded or encountered warnings/errors */}
          {uploadFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex flex-col gap-2 border ${
                uploadFeedback.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {uploadFeedback.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{uploadFeedback.message}</span>
              </div>
              {uploadFeedback.unmatched && uploadFeedback.unmatched.length > 0 && (
                <div className="text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-xl border border-amber-200 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    {t('unmatched_warning', {
                      count: uploadFeedback.unmatched.length,
                      labels: uploadFeedback.unmatched.join(', '),
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Collapsible Quick Paste box */}
          {showPasteBox && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <ClipboardPaste className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t('paste_clipboard_title')}</span>
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
                  {t('apply_btn')}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Matrix Table */}
          <div className="max-h-[50vh] overflow-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-2.5 px-3 bg-slate-100 whitespace-nowrap">{t('area_col_header')}</th>
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
              {t('leave_blank_clear_note')}
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
