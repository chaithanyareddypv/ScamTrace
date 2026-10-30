'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
  Briefcase,
  FileWarning,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import {
  formatCategoryLabel,
  formatDateShort,
  getRiskBadgeClasses,
  getStatusBadgeClasses,
} from '@/lib/utils';

interface IndicatorListItem {
  id: string;
  value: string;
  normalizedValue: string;
  type: string;
  category: string;
  riskScore: number;
  riskLevel: string;
  confidenceScore: number;
  status: string;
  summaryReason: string;
  technicalAttributesJson: string;
  sourceClassification: string;
  associationCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  investigationCase?: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
  } | null;
  threatPattern?: {
    id: string;
    code: string;
    name: string;
    severity: string;
  } | null;
  _count?: {
    reports: number;
    transactions: number;
    messageSamples: number;
  };
}

interface DetailedIndicator extends IndicatorListItem {
  reports: Array<{
    id: string;
    reportNumber: string;
    title: string;
    riskScore: number;
    riskLevel: string;
    createdAt: string;
  }>;
  transactions: Array<{
    id: string;
    referenceId: string;
    paymentRail: string;
    amount: number;
    riskScore: number;
  }>;
  messageSamples: Array<{
    id: string;
    sampleCode: string;
    channel: string;
    content: string;
  }>;
}

export default function IndicatorsPage() {
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [indicators, setIndicators] = useState<IndicatorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicator, setSelectedIndicator] = useState<DetailedIndicator | null>(null);

  const fetchIndicators = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        type: typeFilter,
        riskLevel: riskFilter,
        category: categoryFilter,
        page: String(page),
        pageSize: '15',
      });
      const res = await fetch(`/api/indicators?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIndicators(data.indicators || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalRecords(data.pagination?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [q, typeFilter, riskFilter, categoryFilter, page]);

  useEffect(() => {
    fetchIndicators();
  }, [fetchIndicators]);

  const openIndicatorDetails = async (id: string) => {
    const res = await fetch(`/api/indicators/${id}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedIndicator(data.indicator);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
            Suspicious Indicator Database
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search and inspect {totalRecords.toLocaleString()} cataloged URLs, domains, phone numbers, email addresses, UPI handles, and transaction fingerprints.
          </p>
        </div>

        <a
          href={`/api/export?type=indicators&indicatorType=${encodeURIComponent(
            typeFilter
          )}&riskLevel=${encodeURIComponent(
            riskFilter
          )}&category=${encodeURIComponent(categoryFilter)}&q=${encodeURIComponent(q)}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540]"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Indicators CSV</span>
        </a>
      </div>

      {/* Type Quick-Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'ALL', label: 'All Indicators (820)' },
          { id: 'URL', label: 'URLs (180)' },
          { id: 'DOMAIN', label: 'Domains (140)' },
          { id: 'PHONE', label: 'Phone Numbers (210)' },
          { id: 'EMAIL', label: 'Email Addresses (210)' },
          { id: 'UPI', label: 'UPI Handles (80)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setTypeFilter(tab.id);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              typeFilter === tab.id
                ? 'bg-[#635BFF] text-white border-[#635BFF]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="radar-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search indicator value, ID, or reason..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200"
          />
        </div>

        <select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value);
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
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Scam Categories</option>
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

      {/* Indicators Data Table */}
      <div className="radar-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Indicator ID & Type</th>
                <th className="py-3 px-4">Indicator Value</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Associations</th>
                <th className="py-3 px-4">Associated Case</th>
                <th className="py-3 px-4">First / Last Seen</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Loading suspicious indicators...
                  </td>
                </tr>
              ) : indicators.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No indicators match the current search filters.
                  </td>
                </tr>
              ) : (
                indicators.map((ind) => (
                  <tr key={ind.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#635BFF] block">
                        {ind.id}
                      </span>
                      <span className="text-[10px] font-semibold uppercase text-slate-500">
                        {ind.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-mono font-semibold text-[#0A2540] truncate">
                        {ind.value}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {ind.summaryReason}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700">
                        {formatCategoryLabel(ind.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                          ind.riskLevel
                        )}`}
                      >
                        {ind.riskScore}/100 {ind.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {ind.associationCount} hits
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {ind.investigationCase?.caseNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500">
                      <div>1st: {formatDateShort(ind.firstSeenAt)}</div>
                      <div>Last: {formatDateShort(ind.lastSeenAt)}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openIndicatorDetails(ind.id)}
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 hover:text-[#635BFF] font-medium text-[11px]"
                      >
                        <Eye className="w-3 h-3 inline mr-1" />
                        Why Suspicious
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords.toLocaleString()} indicators)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-200 bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Indicator Modal (Shows WHY suspicious & supporting records) */}
      {selectedIndicator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setSelectedIndicator(null)}
          />
          <div className="relative w-full max-w-3xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-10 max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#635BFF]">
                    {selectedIndicator.id} ({selectedIndicator.type})
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                      selectedIndicator.riskLevel
                    )}`}
                  >
                    Risk: {selectedIndicator.riskScore}/100 ({selectedIndicator.riskLevel})
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getStatusBadgeClasses(
                      selectedIndicator.status
                    )}`}
                  >
                    {selectedIndicator.status}
                  </span>
                </div>
                <p className="font-mono text-sm font-bold text-[#0A2540] mt-1 break-all">
                  {selectedIndicator.value}
                </p>
              </div>
              <button
                onClick={() => setSelectedIndicator(null)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Why Suspicious Box */}
              <div className="p-4 rounded-lg bg-rose-50/60 border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Why This Indicator Is Classified As Suspicious
                  </span>
                  <span className="font-mono text-[11px] text-rose-800">
                    Heuristic Confidence: {selectedIndicator.confidenceScore}%
                  </span>
                </div>
                <p className="text-rose-950 leading-relaxed">
                  {selectedIndicator.summaryReason}
                </p>
                <div className="p-2.5 rounded bg-white border border-rose-200/70 font-mono text-[11px] text-slate-700 overflow-x-auto">
                  Technical Telemetry: {selectedIndicator.technicalAttributesJson}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">
                    Category
                  </p>
                  <p className="font-bold text-[#0A2540]">
                    {formatCategoryLabel(selectedIndicator.category)}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">
                    Associations
                  </p>
                  <p className="font-bold text-[#0A2540]">
                    {selectedIndicator.associationCount} Correlated Records
                  </p>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">
                    First Seen
                  </p>
                  <p className="font-bold text-[#0A2540]">
                    {formatDateShort(selectedIndicator.firstSeenAt)}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold">
                    Last Seen
                  </p>
                  <p className="font-bold text-[#0A2540]">
                    {formatDateShort(selectedIndicator.lastSeenAt)}
                  </p>
                </div>
              </div>

              {/* Supporting Records */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#0A2540]">
                  Supporting Database Records & Corroborating Evidence
                </h4>

                {selectedIndicator.investigationCase && (
                  <div className="p-3 rounded border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#635BFF]" />
                      <div>
                        <p className="font-bold text-[#0A2540]">
                          Linked Case: {selectedIndicator.investigationCase.caseNumber}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {selectedIndicator.investigationCase.title}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-white border border-indigo-200">
                      {selectedIndicator.investigationCase.status}
                    </span>
                  </div>
                )}

                {/* Supporting Scam Reports */}
                {selectedIndicator.reports?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileWarning className="w-3.5 h-3.5 text-amber-600" />
                      <span>Corroborating Scam Reports ({selectedIndicator.reports.length})</span>
                    </p>
                    {selectedIndicator.reports.map((r) => (
                      <div
                        key={r.id}
                        className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <span>
                          <strong className="font-mono text-[#635BFF]">
                            {r.reportNumber}:
                          </strong>{' '}
                          {r.title}
                        </span>
                        <span className="font-mono font-bold">
                          {r.riskScore}/100
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Supporting Transactions */}
                {selectedIndicator.transactions?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                      <span>Linked Transaction Events ({selectedIndicator.transactions.length})</span>
                    </p>
                    {selectedIndicator.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <span className="font-mono">
                          {tx.referenceId} ({tx.paymentRail})
                        </span>
                        <span className="font-mono font-bold text-rose-600">
                          ${tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Supporting Message Samples */}
                {selectedIndicator.messageSamples?.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Embedded in Message Samples ({selectedIndicator.messageSamples.length})</span>
                    </p>
                    {selectedIndicator.messageSamples.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600"
                      >
                        <strong>{m.sampleCode}:</strong> {m.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

