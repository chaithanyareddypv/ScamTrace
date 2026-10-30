'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string | null;
  actorEmail: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  summary: string;
  metadataJson: string | null;
  ipAddress: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [q, setQ] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        action: actionFilter,
        role: roleFilter,
      });
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } finally {
      setLoading(false);
    }
  }, [q, actionFilter, roleFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#635BFF]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
              Security & Compliance Audit Logs
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable chronological trail of authentication events, scam analyses, case updates, evidence additions, rule changes, and data exports.
          </p>
        </div>

        <a
          href="/api/export?type=audit-logs"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540]"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Audit Trail CSV</span>
        </a>
      </div>

      {/* Filters */}
      <div className="radar-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search actor email, summary, or target ID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Recorded Events</option>
          <option value="USER_LOGIN">User Login</option>
          <option value="USER_LOGOUT">User Logout</option>
          <option value="USER_SIGNUP">Account Registration</option>
          <option value="ANALYSIS_EXECUTED">Scam Analysis Executed</option>
          <option value="REPORT_CREATED">Report Created</option>
          <option value="REPORT_UPDATED">Report Updated</option>
          <option value="CASE_CREATED">Case Created</option>
          <option value="CASE_ASSIGNED">Case Assigned</option>
          <option value="CASE_STATUS_CHANGED">Case Status Changed</option>
          <option value="EVIDENCE_ADDED">Evidence Added</option>
          <option value="RULE_UPDATED">Detection Rule Updated</option>
          <option value="DATA_EXPORTED">Dataset Exported</option>
          <option value="SETTINGS_UPDATED">Settings Updated</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Actor Roles</option>
          <option value="ADMINISTRATOR">Administrator</option>
          <option value="INVESTIGATOR">Investigator</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="radar-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Action</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Summary</th>
                <th className="py-3 px-4">Source IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No audit log entries match the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-50 text-[#635BFF] border border-indigo-200/70">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#0A2540]">
                        {log.actorEmail}
                      </p>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        {log.actorRole}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <span className="text-slate-400">{log.targetType}:</span>{' '}
                      {log.targetId}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">
                      {log.summary}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          All security-relevant operations across Authentication, Analysis, Reports, Investigations, Rules, Evidence, and Exports are logged automatically on the server.
        </span>
      </div>
    </div>
  );
}

