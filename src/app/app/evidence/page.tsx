'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Upload,
  Search,
  ShieldCheck,
  FileCheck2,
  Clock,
  X,
  Info,
} from 'lucide-react';
import {
  formatCategoryLabel,
  formatDateTime,
  getStatusBadgeClasses,
} from '@/lib/utils';
import { useToast } from '@/components/ui/toast-provider';

interface EvidenceItem {
  id: string;
  evidenceCode: string;
  title: string;
  type: string;
  description: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  storageMode: string;
  verificationStatus: string;
  chainOfCustodyNotes: string;
  caseId: string;
  createdAt: string;
  investigationCase?: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
  };
  uploadedBy?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export default function EvidenceVaultPage() {
  const { toast } = useToast();

  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [cases, setCases] = useState<
    Array<{ id: string; caseNumber: string; title: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  // Upload Evidence Modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('SCREENSHOT_METADATA');
  const [caseId, setCaseId] = useState('CASE-2026-0001');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('phishing_landing_capture.png');
  const [mimeType, setMimeType] = useState('image/png');
  const [fileSizeBytes, setFileSizeBytes] = useState(248500);
  const [contentSnippet, setContentSnippet] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        type: typeFilter,
        verificationStatus: statusFilter,
      });
      const res = await fetch(`/api/evidence?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvidenceList(data.evidence || []);
        setCases(data.cases || []);
      }
    } finally {
      setLoading(false);
    }
  }, [q, typeFilter, statusFilter]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File exceeds 5 MB limit',
        description: 'Maximum permitted evidence file size is 5,242,880 bytes.',
        variant: 'error',
      });
      return;
    }

    setFileName(file.name);
    setMimeType(file.type || 'text/plain');
    setFileSizeBytes(file.size);
    if (!title) {
      setTitle(`Forensic Artifact: ${file.name}`);
    }
  };

  const handleCreateEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const res = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          description,
          caseId,
          fileName,
          mimeType,
          fileSizeBytes: Number(fileSizeBytes),
          contentSnippet,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Evidence validation failed',
          description: data.error || 'Check file extension and size.',
          variant: 'error',
        });
        return;
      }

      toast({
        title: `Logged ${data.evidence.evidenceCode}`,
        description: `SHA-256 integrity hash verified and linked to ${caseId}.`,
        variant: 'success',
      });
      setUploadOpen(false);
      setTitle('');
      setDescription('');
      loadEvidence();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
              Forensic Evidence Vault
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              SHA-256 Chain of Custody
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized repository for verified screenshots, email headers, DOM snapshots, transaction receipts, and DNS records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#635BFF] hover:bg-[#5249E8] text-white text-xs font-semibold shadow-2xs"
        >
          <Upload className="w-4 h-4" />
          <span>Add Forensic Evidence</span>
        </button>
      </div>

      {/* Storage Mode Transparency Notice */}
      <div className="radar-card p-3.5 bg-indigo-50/50 border-indigo-200/80 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-indigo-950">
          <Info className="w-4 h-4 text-[#635BFF] shrink-0" />
          <span>
            <strong>Storage Mode (`metadata-local`):</strong> File uploads enforce strict MIME type allowlisting (`.png`, `.jpg`, `.webp`, `.pdf`, `.txt`, `.html`, `.json`, `.eml`), 5 MB size limits, and server-side SHA-256 cryptographic digest generation.
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="radar-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search evidence code, filename, or SHA-256..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Artifact Types</option>
          <option value="SCREENSHOT_METADATA">Screenshot Metadata</option>
          <option value="EMAIL_HEADER">Email Header (.eml)</option>
          <option value="DOM_SNAPSHOT">DOM Snapshot (.html)</option>
          <option value="TRANSACTION_RECEIPT">Transaction Receipt (.pdf)</option>
          <option value="CHAT_TRANSCRIPT">Chat Transcript</option>
          <option value="DNS_RECORD_SYNTHETIC">Synthetic DNS Record</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Verification Statuses</option>
          <option value="VERIFIED">Verified</option>
          <option value="INTEGRITY_CHECKED">Integrity Checked</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="NEEDS_CORROBORATION">Needs Corroboration</option>
        </select>
      </div>

      {/* Main Content Grid: Evidence Table + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 radar-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Evidence ID & Case</th>
                  <th className="py-3 px-4">Artifact & Description</th>
                  <th className="py-3 px-4">File Metadata & Hash</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Loading forensic evidence vault...
                    </td>
                  </tr>
                ) : (
                  evidenceList.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#635BFF] block">
                          {ev.evidenceCode}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {ev.investigationCase?.caseNumber || ev.caseId}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700">
                          {formatCategoryLabel(ev.type)}
                        </span>
                        <p className="font-bold text-[#0A2540] mt-0.5 truncate">
                          {ev.title}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {ev.description}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <p className="font-semibold text-[#0A2540]">{ev.fileName}</p>
                        <p className="text-slate-500">
                          {ev.mimeType} • {(ev.fileSizeBytes / 1024).toFixed(1)} KB
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          SHA256: {ev.sha256Hash}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#0A2540]">
                          {ev.uploadedBy?.fullName || 'Threat Ops'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatDateTime(ev.createdAt)}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded border inline-flex items-center gap-1 ${getStatusBadgeClasses(
                            ev.verificationStatus
                          )}`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {formatCategoryLabel(ev.verificationStatus)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Evidence Activity Timeline */}
        <div className="lg:col-span-4 radar-card p-5 space-y-4 max-h-[680px] overflow-y-auto">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#635BFF]" />
            <h3 className="text-sm font-bold text-[#0A2540]">
              Evidence Custody Activity Timeline
            </h3>
          </div>

          <div className="space-y-3 border-l-2 border-indigo-200 pl-3.5">
            {evidenceList.slice(0, 12).map((ev) => (
              <div key={ev.id} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#635BFF]">
                    {ev.evidenceCode}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatDateTime(ev.createdAt)}
                  </span>
                </div>
                <p className="font-semibold text-[#0A2540]">{ev.fileName}</p>
                <p className="text-[11px] text-slate-500">
                  {ev.chainOfCustodyNotes}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Evidence Modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setUploadOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-10">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#635BFF]" />
                <h3 className="text-base font-bold text-[#0A2540]">
                  Ingest Forensic Evidence Artifact
                </h3>
              </div>
              <button
                onClick={() => setUploadOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvidence} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300">
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Select Local File for Metadata & SHA-256 Digest (Optional)
                </label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.html,.json,.eml"
                  onChange={handleFileInputChange}
                  className="text-xs text-slate-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Allowed: .png, .jpg, .webp, .pdf, .txt, .html, .json, .eml (Max 5 MB)
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Artifact Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Captured Phishing Login DOM Snapshot"
                  className="w-full px-3 py-2 rounded border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Evidence Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                  >
                    <option value="SCREENSHOT_METADATA">Screenshot Metadata</option>
                    <option value="EMAIL_HEADER">Email Header</option>
                    <option value="DOM_SNAPSHOT">DOM Snapshot</option>
                    <option value="TRANSACTION_RECEIPT">Transaction Receipt</option>
                    <option value="CHAT_TRANSCRIPT">Chat Transcript</option>
                    <option value="DNS_RECORD_SYNTHETIC">Synthetic DNS Record</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Associated Case
                  </label>
                  <select
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                  >
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    File Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    MIME Type
                  </label>
                  <select
                    value={mimeType}
                    onChange={(e) => setMimeType(e.target.value)}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    <option value="image/png">image/png</option>
                    <option value="image/jpeg">image/jpeg</option>
                    <option value="application/pdf">application/pdf</option>
                    <option value="text/plain">text/plain</option>
                    <option value="text/html">text/html</option>
                    <option value="application/json">application/json</option>
                    <option value="message/rfc822">message/rfc822</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Size (Bytes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5242880}
                    value={fileSizeBytes}
                    onChange={(e) => setFileSizeBytes(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Forensic Description & Custody Notes
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this artifact demonstrates and how it was collected..."
                  className="w-full p-2.5 rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0A2540] mb-1">
                  Raw Header / Payload Excerpt (Included in SHA-256 Digest)
                </label>
                <input
                  type="text"
                  value={contentSnippet}
                  onChange={(e) => setContentSnippet(e.target.value)}
                  placeholder="Optional raw header or text snippet..."
                  className="w-full px-3 py-1.5 font-mono rounded border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadOpen(false)}
                  className="px-4 py-2 rounded border border-slate-300 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded bg-[#635BFF] text-white font-semibold inline-flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Verifying...' : 'Hash & Store Evidence'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

