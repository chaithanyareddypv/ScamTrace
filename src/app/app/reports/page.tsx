'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Download,
  Archive,
  Eye,
  Link2,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
  ShieldAlert,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  formatCategoryLabel,
  formatDateShort,
  formatDateTime,
  getRiskBadgeClasses,
  getStatusBadgeClasses,
} from '@/lib/utils';
import { useToast } from '@/components/ui/toast-provider';

interface ReportListItem {
  id: string;
  reportNumber: string;
  title: string;
  category: string;
  description: string;
  submittedIndicatorValue: string;
  submittedIndicatorType: string;
  riskLevel: string;
  riskScore: number;
  status: string;
  reporterChannel: string;
  detectionExplanation: string;
  triggeredRulesJson: string;
  financialLossAmount: number;
  caseId: string | null;
  indicatorId: string | null;
  createdAt: string;
  updatedAt: string;
  investigationCase?: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
  } | null;
  indicator?: {
    id: string;
    value: string;
    type: string;
    riskScore: number;
  } | null;
}

export default function ScamReportsPage() {
  const { toast } = useToast();

  // Filter & Pagination state
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('ALL');
  const [riskLevel, setRiskLevel] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [dateRange, setDateRange] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail modal state
  const [selectedReport, setSelectedReport] = useState<ReportListItem | null>(null);
  const [availableCases, setAvailableCases] = useState<
    Array<{ id: string; caseNumber: string; title: string }>
  >([]);

  // Create Report modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('PHISHING');
  const [newIndType, setNewIndType] = useState('URL');
  const [newIndValue, setNewIndValue] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLoss, setNewLoss] = useState('0');
  const [newCaseId, setNewCaseId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        category,
        riskLevel,
        status,
        dateRange,
        sortBy,
        sortDir,
        page: String(page),
        pageSize: '15',
      });
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [q, category, riskLevel, status, dateRange, sortBy, sortDir, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    fetch('/api/investigations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.cases) {
          setAvailableCases(
            d.cases.map((c: { id: string; caseNumber: string; title: string }) => ({
              id: c.id,
              caseNumber: c.caseNumber,
              title: c.title,
            }))
          );
        }
      })
      .catch(() => undefined);
  }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const handleUpdateReport = async (
    reportId: string,
    updates: { status?: string; caseId?: string | null; title?: string; description?: string }
  ) => {
    const res = await fetch(`/api/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({
        title: 'Update failed',
        description: data.error || 'Could not update scam report.',
        variant: 'error',
      });
      return;
    }
    toast({
      title: 'Report updated',
      description: `${data.report.reportNumber} updated successfully.`,
      variant: 'success',
    });
    if (selectedReport?.id === reportId) {
      setSelectedReport(data.report);
    }
    fetchReports();
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          description: newDescription,
          submittedIndicatorType: newIndType,
          submittedIndicatorValue: newIndValue,
          financialLossAmount: Number(newLoss) || 0,
          caseId: newCaseId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Failed to create report',
          description: data.error || 'Check form fields.',
          variant: 'error',
        });
        return;
      }

      toast({
        title: `Report ${data.report.reportNumber} Created`,
        description: `Automatically scored at ${data.report.riskScore}/100 (${data.report.riskLevel}).`,
        variant: 'success',
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewIndValue('');
      setNewDescription('');
      setNewLoss('0');
      fetchReports();
    } finally {
      setSubmitting(false);
    }
  };

  const exportUrl = `/api/export?type=reports&category=${encodeURIComponent(
    category
  )}&riskLevel=${encodeURIComponent(riskLevel)}&status=${encodeURIComponent(
    status
  )}&q=${encodeURIComponent(q)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
            Scam Report Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse, triage, filter, archive, and link {totalRecords.toLocaleString()} digital scam reports to active investigations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={exportUrl}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540]"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </a>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#635BFF] hover:bg-[#5249E8] text-white text-xs font-semibold shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Scam Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="radar-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search report ID, title, or indicator..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:border-[#635BFF] focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Categories</option>
          <option value="PHISHING">Phishing</option>
          <option value="UPI_FRAUD">UPI Fraud</option>
          <option value="FAKE_JOB">Fake Job</option>
          <option value="INVESTMENT_SCAM">Investment Scam</option>
          <option value="DELIVERY_SCAM">Delivery Scam</option>
          <option value="IMPERSONATION">Impersonation</option>
          <option value="PAYMENT_REQUEST">Payment Request</option>
          <option value="TECH_SUPPORT">Tech Support</option>
        </select>

        <select
          value={riskLevel}
          onChange={(e) => {
            setRiskLevel(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="CRITICAL">Critical (75–100)</option>
          <option value="HIGH">High (50–74)</option>
          <option value="MEDIUM">Medium (25–49)</option>
          <option value="LOW">Low (0–24)</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="TRIAGED">Triaged</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="VERIFIED_SCAM">Verified Scam</option>
          <option value="ARCHIVED">Archived</option>
          <option value="FALSE_POSITIVE">False Positive</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) => {
            setDateRange(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Dates</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="radar-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">
                  <button
                    onClick={() => handleSort('reportNumber')}
                    className="inline-flex items-center gap-1 hover:text-[#0A2540]"
                  >
                    <span>Report ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Scam Category & Title</th>
                <th className="py-3 px-4">Submitted Indicator</th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => handleSort('riskScore')}
                    className="inline-flex items-center gap-1 hover:text-[#0A2540]"
                  >
                    <span>Risk Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Linked Case</th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="inline-flex items-center gap-1 hover:text-[#0A2540]"
                  >
                    <span>Submitted</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Loading scam reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No scam reports match the current filters.
                  </td>
                </tr>
              ) : (
                reports.map((rpt) => (
                  <tr key={rpt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#635BFF]">
                      {rpt.reportNumber}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 mb-0.5">
                        {formatCategoryLabel(rpt.category)}
                      </span>
                      <p className="font-medium text-[#0A2540] truncate">
                        {rpt.title}
                      </p>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="text-[10px] font-semibold text-indigo-600 uppercase mr-1.5">
                        [{rpt.submittedIndicatorType}]
                      </span>
                      <span className="font-mono text-slate-700 truncate block">
                        {rpt.submittedIndicatorValue}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                          rpt.riskLevel
                        )}`}
                      >
                        {rpt.riskScore}/100 {rpt.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getStatusBadgeClasses(
                          rpt.status
                        )}`}
                      >
                        {formatCategoryLabel(rpt.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {rpt.investigationCase?.caseNumber || 'Unlinked'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDateShort(rpt.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(rpt)}
                          className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 hover:text-[#635BFF] font-medium text-[11px]"
                        >
                          <Eye className="w-3 h-3 inline mr-1" />
                          Details
                        </button>
                        {rpt.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateReport(rpt.id, { status: 'ARCHIVED' })
                            }
                            title="Archive report"
                            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords.toLocaleString()} total reports)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setSelectedReport(null)}
          />
          <div className="relative w-full max-w-3xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-10 max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#635BFF]">
                    {selectedReport.reportNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                      selectedReport.riskLevel
                    )}`}
                  >
                    {selectedReport.riskScore}/100 {selectedReport.riskLevel}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getStatusBadgeClasses(
                      selectedReport.status
                    )}`}
                  >
                    {formatCategoryLabel(selectedReport.status)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0A2540] mt-1">
                  {selectedReport.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Scam Category
                  </p>
                  <p className="font-bold text-[#0A2540] mt-0.5">
                    {formatCategoryLabel(selectedReport.category)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Reporter Channel
                  </p>
                  <p className="font-bold text-[#0A2540] mt-0.5">
                    {formatCategoryLabel(selectedReport.reporterChannel)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Reported Financial Loss
                  </p>
                  <p className="font-bold text-[#0A2540] mt-0.5">
                    ${selectedReport.financialLossAmount.toLocaleString()} USD
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 space-y-1">
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Submitted Suspicious Indicator ({selectedReport.submittedIndicatorType})
                </p>
                <p className="font-mono text-xs font-bold text-[#0A2540] break-all">
                  {selectedReport.submittedIndicatorValue}
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-[#0A2540]">Incident Description</p>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
                  {selectedReport.description}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-indigo-50/60 border border-indigo-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-950">
                  <ShieldAlert className="w-4 h-4 text-[#635BFF]" />
                  <span>Explainable Detection Assessment</span>
                </div>
                <p className="text-indigo-950 leading-relaxed">
                  {selectedReport.detectionExplanation}
                </p>
              </div>

              {/* Triage & Case Link Controls */}
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0A2540] mb-1">
                    Update Triage Status
                  </label>
                  <select
                    value={selectedReport.status}
                    onChange={(e) =>
                      handleUpdateReport(selectedReport.id, {
                        status: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  >
                    <option value="OPEN">Open</option>
                    <option value="TRIAGED">Triaged</option>
                    <option value="INVESTIGATING">Investigating</option>
                    <option value="VERIFIED_SCAM">Verified Scam</option>
                    <option value="ARCHIVED">Archived</option>
                    <option value="FALSE_POSITIVE">False Positive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#0A2540] mb-1">
                    <Link2 className="w-3.5 h-3.5 inline mr-1 text-[#635BFF]" />
                    Link to Investigation Case
                  </label>
                  <select
                    value={selectedReport.caseId || ''}
                    onChange={(e) =>
                      handleUpdateReport(selectedReport.id, {
                        caseId: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  >
                    <option value="">-- Unlinked --</option>
                    {availableCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber}: {c.title.slice(0, 45)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <p className="font-semibold text-[#0A2540] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Report Audit Timeline</span>
                </p>
                <div className="space-y-1.5 pl-2 border-l-2 border-indigo-200 text-[11px] text-slate-600">
                  <p>
                    <CheckCircle2 className="w-3 h-3 inline text-emerald-600 mr-1" />
                    <strong>Submitted & Scored:</strong>{' '}
                    {formatDateTime(selectedReport.createdAt)}
                  </p>
                  <p>
                    <CheckCircle2 className="w-3 h-3 inline text-indigo-600 mr-1" />
                    <strong>Last Modified:</strong>{' '}
                    {formatDateTime(selectedReport.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Scam Report Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setCreateOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-10">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0A2540]">
                Create & Score New Scam Report
              </h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateReport} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Suspicious HDFC KYC SMS Phishing Link"
                  className="w-full px-3 py-2 rounded border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Scam Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                  >
                    <option value="PHISHING">Phishing</option>
                    <option value="UPI_FRAUD">UPI Fraud</option>
                    <option value="FAKE_JOB">Fake Job</option>
                    <option value="INVESTMENT_SCAM">Investment Scam</option>
                    <option value="DELIVERY_SCAM">Delivery Scam</option>
                    <option value="IMPERSONATION">Impersonation</option>
                    <option value="PAYMENT_REQUEST">Payment Request</option>
                    <option value="TECH_SUPPORT">Tech Support</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Indicator Type
                  </label>
                  <select
                    value={newIndType}
                    onChange={(e) => setNewIndType(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                  >
                    <option value="URL">URL</option>
                    <option value="DOMAIN">Domain</option>
                    <option value="PHONE">Phone Number</option>
                    <option value="EMAIL">Email Address</option>
                    <option value="UPI">UPI Handle</option>
                    <option value="TRANSACTION">Transaction Ref</option>
                    <option value="MESSAGE">Message Sample</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Submitted Suspicious Indicator
                </label>
                <input
                  type="text"
                  required
                  value={newIndValue}
                  onChange={(e) => setNewIndValue(e.target.value)}
                  placeholder="https://hdfc-kyc-portal.example/verify-kyc"
                  className="w-full px-3 py-2 font-mono rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Incident Description & Context
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe how the indicator was received and what action it requested..."
                  className="w-full p-3 rounded border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Estimated Loss (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newLoss}
                    onChange={(e) => setNewLoss(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Link to Case (Optional)
                  </label>
                  <select
                    value={newCaseId}
                    onChange={(e) => setNewCaseId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                  >
                    <option value="">-- None --</option>
                    {availableCases.slice(0, 30).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded border border-slate-300 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-[#635BFF] text-white font-semibold"
                >
                  {submitting ? 'Scoring & Saving...' : 'Analyze & Create Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

