'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Download,
  Printer,
  UserCheck,
  MessageSquarePlus,
  FileWarning,
  Fingerprint,
  Lock,
  X,
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

interface CaseSummary {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  riskLevel: string;
  riskScore: number;
  status: string;
  assignedToId: string | null;
  resolutionSummary: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  _count?: {
    reports: number;
    indicators: number;
    evidence: number;
    notes: number;
  };
}

interface DetailedCase extends CaseSummary {
  reports: Array<{
    id: string;
    reportNumber: string;
    title: string;
    riskScore: number;
    riskLevel: string;
    status: string;
  }>;
  indicators: Array<{
    id: string;
    value: string;
    type: string;
    riskScore: number;
    riskLevel: string;
  }>;
  evidence: Array<{
    id: string;
    evidenceCode: string;
    title: string;
    type: string;
    fileName: string;
    sha256Hash: string;
    verificationStatus: string;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    authorName: string;
    noteType: string;
    content: string;
    createdAt: string;
  }>;
}

export default function InvestigationsPage() {
  const { toast } = useToast();

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [investigators, setInvestigators] = useState<
    Array<{ id: string; fullName: string; role: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  const [activeCase, setActiveCase] = useState<DetailedCase | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [updatingCase, setUpdatingCase] = useState(false);

  // Create new case modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('PHISHING');
  const [newPriority, setNewPriority] = useState('HIGH');
  const [newRiskScore, setNewRiskScore] = useState('78');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        status: statusFilter,
        priority: priorityFilter,
        riskLevel: riskFilter,
      });
      const res = await fetch(`/api/investigations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
        setInvestigators(data.investigators || []);
      }
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, priorityFilter, riskFilter]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const openCaseDetails = async (caseId: string) => {
    const res = await fetch(`/api/investigations/${caseId}`);
    if (res.ok) {
      const data = await res.json();
      setActiveCase(data.investigationCase);
    }
  };

  // Automatically select first case on initial load
  useEffect(() => {
    if (!activeCase && cases.length > 0) {
      openCaseDetails(cases[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases]);

  const handleUpdateCase = async (updates: Record<string, unknown>) => {
    if (!activeCase) return;
    setUpdatingCase(true);
    try {
      const res = await fetch(`/api/investigations/${activeCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Case update failed',
          description: data.error || 'Permission denied',
          variant: 'error',
        });
        return;
      }
      setActiveCase(data.investigationCase);
      setNoteInput('');
      loadCases();
      toast({
        title: `${activeCase.caseNumber} Updated`,
        description: 'Investigation dossier synchronized.',
        variant: 'success',
      });
    } finally {
      setUpdatingCase(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/investigations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        category: newCategory,
        priority: newPriority,
        riskScore: Number(newRiskScore) || 75,
        description: newDescription,
        assignedToId: newAssignee || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({
        title: 'Cannot create case',
        description: data.error || 'Validation failed',
        variant: 'error',
      });
      return;
    }
    toast({
      title: `Created ${data.investigationCase.caseNumber}`,
      description: data.investigationCase.title,
      variant: 'success',
    });
    setCreateOpen(false);
    setNewTitle('');
    setNewDescription('');
    loadCases();
    openCaseDetails(data.investigationCase.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
            Investigation Case Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinate forensic investigations, assign analysts, link indicators and evidence, and export formal case dossiers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/export?type=investigations&status=${encodeURIComponent(
              statusFilter
            )}&riskLevel=${encodeURIComponent(riskFilter)}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540]"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Cases CSV</span>
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540]"
          >
            <Printer className="w-3.5 h-3.5 text-[#635BFF]" />
            <span>Print Case Report (PDF)</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#635BFF] hover:bg-[#5249E8] text-white text-xs font-semibold shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Investigation Case</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="radar-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 no-print">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search case number or title..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">New</option>
          <option value="UNDER_INVESTIGATION">Under Investigation</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="CRITICAL">Critical Risk</option>
          <option value="HIGH">High Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="LOW">Low Risk</option>
        </select>
      </div>

      {/* Master-Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List of Investigation Cases */}
        <div className="lg:col-span-5 radar-card overflow-hidden flex flex-col max-h-[780px] no-print">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs font-bold text-[#0A2540]">
            <span>Investigation Queue ({cases.length})</span>
            <span className="text-[11px] font-normal text-slate-500">
              Select to inspect dossier
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading investigation cases...
              </div>
            ) : cases.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No cases match the current filters.
              </div>
            ) : (
              cases.map((c) => {
                const isSelected = activeCase?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openCaseDetails(c.id)}
                    className={`w-full text-left p-4 transition-colors space-y-2 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-l-[#635BFF]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#635BFF]">
                        {c.caseNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                            c.riskLevel
                          )}`}
                        >
                          {c.riskScore}/100
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getStatusBadgeClasses(
                            c.status
                          )}`}
                        >
                          {formatCategoryLabel(c.status)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-[#0A2540] line-clamp-1">
                      {c.title}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Assignee: <strong>{c.assignedTo?.fullName || 'Unassigned'}</strong>
                      </span>
                      <span>
                        {c._count?.reports ?? 0} rpts • {c._count?.evidence ?? 0} evd
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detailed Case Dossier (Also Printable for PDF Report Generation) */}
        <div className="lg:col-span-7 radar-card p-6 space-y-6">
          {activeCase ? (
            <>
              {/* Dossier Header */}
              <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#0A2540] text-white">
                      {activeCase.caseNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                        activeCase.riskLevel
                      )}`}
                    >
                      Risk: {activeCase.riskScore}/100 ({activeCase.riskLevel})
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getStatusBadgeClasses(
                        activeCase.status
                      )}`}
                    >
                      {formatCategoryLabel(activeCase.status)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Priority: <strong>{activeCase.priority}</strong>
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0A2540] pt-1">
                    {activeCase.title}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Opened {formatDateShort(activeCase.createdAt)} • Last Updated{' '}
                    {formatDateTime(activeCase.updatedAt)} • Category:{' '}
                    {formatCategoryLabel(activeCase.category)}
                  </p>
                </div>
              </div>

              {/* Status & Investigator Assignment Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 no-print">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Case Status
                  </label>
                  <select
                    disabled={updatingCase}
                    value={activeCase.status}
                    onChange={(e) =>
                      handleUpdateCase({ status: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium"
                  >
                    <option value="NEW">New</option>
                    <option value="UNDER_INVESTIGATION">Under Investigation</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    Priority Level
                  </label>
                  <select
                    disabled={updatingCase}
                    value={activeCase.priority}
                    onChange={(e) =>
                      handleUpdateCase({ priority: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                    <UserCheck className="w-3 h-3 inline mr-1 text-[#635BFF]" />
                    Assigned Investigator
                  </label>
                  <select
                    disabled={updatingCase}
                    value={activeCase.assignedToId || ''}
                    onChange={(e) =>
                      handleUpdateCase({
                        assignedToId: e.target.value || null,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white font-medium"
                  >
                    <option value="">Unassigned</option>
                    {investigators.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.fullName} ({inv.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Case Summary Description */}
              <div className="space-y-1 text-xs">
                <h3 className="font-bold text-[#0A2540]">Investigation Scope & Summary</h3>
                <p className="text-slate-600 leading-relaxed p-3 rounded bg-slate-50/70 border border-slate-200/80">
                  {activeCase.description}
                </p>
              </div>

              {/* Linked Entities Grid: Reports, Indicators, Evidence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Linked Scam Reports */}
                <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <h4 className="font-bold text-[#0A2540] flex items-center gap-1.5">
                    <FileWarning className="w-3.5 h-3.5 text-[#635BFF]" />
                    <span>Related Scam Reports ({activeCase.reports?.length || 0})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {activeCase.reports?.map((r) => (
                      <div
                        key={r.id}
                        className="p-2 rounded bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-mono font-semibold text-[#635BFF]">
                            {r.reportNumber}
                          </span>
                          <p className="text-[11px] text-slate-600 truncate">
                            {r.title}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-slate-700 shrink-0">
                          {r.riskScore}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Linked Indicators */}
                <div className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <h4 className="font-bold text-[#0A2540] flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-purple-600" />
                    <span>Linked Indicators ({activeCase.indicators?.length || 0})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {activeCase.indicators?.map((ind) => (
                      <div
                        key={ind.id}
                        className="p-2 rounded bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-semibold text-indigo-600">
                            [{ind.type}] {ind.id}
                          </span>
                          <p className="font-mono text-[11px] text-[#0A2540] truncate">
                            {ind.value}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-rose-600 shrink-0">
                          {ind.riskScore}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Linked Forensic Evidence */}
              <div className="p-3.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-[#0A2540] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chain-of-Custody Evidence Artifacts ({activeCase.evidence?.length || 0})</span>
                </h4>
                <div className="space-y-1.5">
                  {activeCase.evidence?.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-2 rounded bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0A2540]">
                          {ev.evidenceCode}: {ev.title} ({ev.fileName})
                        </p>
                        <p className="font-mono text-[10px] text-slate-500 truncate">
                          SHA-256: {ev.sha256Hash}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        {formatCategoryLabel(ev.verificationStatus)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Investigation Notes & History */}
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-[#0A2540]">
                  Investigation Notes & Audit History ({activeCase.notes?.length || 0})
                </h4>

                <div className="flex gap-2 no-print">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Add forensic observation, corroboration note, or triage update..."
                    className="flex-1 px-3 py-2 rounded border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    disabled={!noteInput.trim() || updatingCase}
                    onClick={() =>
                      handleUpdateCase({ noteContent: noteInput.trim() })
                    }
                    className="px-3.5 py-2 rounded bg-[#635BFF] text-white font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span>Add Note</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeCase.notes?.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-[#0A2540]">
                          {note.authorName}{' '}
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 ml-1">
                            {note.noteType}
                          </span>
                        </span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                      <p className="text-slate-700">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Select an investigation case from the queue to inspect its full dossier.
            </div>
          )}
        </div>
      </div>

      {/* Create Case Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setCreateOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-10">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0A2540]">
                Open New Investigation Case
              </h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCase} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Investigation Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Coordinated UPI Refund Handle Phishing Campaign"
                  className="w-full px-3 py-2 rounded border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded border border-slate-300 bg-white"
                  >
                    <option value="PHISHING">Phishing</option>
                    <option value="UPI_FRAUD">UPI Fraud</option>
                    <option value="FAKE_JOB">Fake Job</option>
                    <option value="INVESTMENT_SCAM">Investment</option>
                    <option value="DELIVERY_SCAM">Delivery</option>
                    <option value="IMPERSONATION">Impersonation</option>
                    <option value="PAYMENT_REQUEST">Payment</option>
                    <option value="TECH_SUPPORT">Tech Support</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-2.5 py-2 rounded border border-slate-300 bg-white"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Initial Risk Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRiskScore}
                    onChange={(e) => setNewRiskScore(e.target.value)}
                    className="w-full px-2.5 py-2 rounded border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Assign Lead Investigator
                </label>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                >
                  <option value="">Assign to Me</option>
                  {investigators.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.fullName} ({inv.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Case Scope & Initial Hypothesis
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Outline the correlated indicators, suspected modus operandi, and verification plan..."
                  className="w-full p-3 rounded border border-slate-300"
                />
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
                  className="px-4 py-2 rounded bg-[#635BFF] text-white font-semibold"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

