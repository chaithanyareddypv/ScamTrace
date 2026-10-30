'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  ExternalLink,
} from 'lucide-react';
import { formatCategoryLabel, formatDateTime } from '@/lib/utils';
import { useToast } from '@/components/ui/toast-provider';

interface AlertItem {
  id: string;
  title: string;
  message: string;
  category: string;
  severity: string;
  isRead: boolean;
  actionUrl: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

export default function AlertsPage() {
  const { toast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: categoryFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleToggleRead = async (id: string, isRead: boolean) => {
    const res = await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isRead }),
    });
    if (res.ok) {
      loadAlerts();
    }
  };

  const handleMarkAllRead = async () => {
    const res = await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    if (res.ok) {
      toast({
        title: 'All notifications marked as read',
        variant: 'success',
      });
      loadAlerts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#635BFF]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
              Alert & Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor high-risk analysis triggers, new case assignments, forensic evidence updates, and detection rule modifications.
          </p>
        </div>

        <button
          type="button"
          disabled={unreadCount === 0}
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-200 text-xs font-semibold text-[#0A2540]"
        >
          <CheckCheck className="w-4 h-4 text-[#635BFF]" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Category & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Alerts' },
            { id: 'HIGH_RISK_ANALYSIS', label: 'High-Risk Analysis' },
            { id: 'NEW_INVESTIGATION', label: 'New Investigations' },
            { id: 'CASE_ASSIGNMENT', label: 'Case Assignments' },
            { id: 'EVIDENCE_UPDATE', label: 'Evidence Updates' },
            { id: 'RULE_MODIFICATION', label: 'Rule Modifications' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-[#635BFF] text-white border-[#635BFF]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white font-medium"
        >
          <option value="ALL">All Statuses</option>
          <option value="UNREAD">Unread Only</option>
          <option value="READ">Read Only</option>
        </select>
      </div>

      {/* Alerts List */}
      <div className="radar-card divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No alerts match the selected filter criteria.
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                !alert.isRead ? 'bg-indigo-50/35' : 'bg-white hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {alert.severity === 'CRITICAL' ? (
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                  ) : alert.severity === 'HIGH' || alert.severity === 'WARNING' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Info className="w-5 h-5 text-indigo-600" />
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {!alert.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#635BFF]" />
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-slate-100 text-slate-700">
                      {formatCategoryLabel(alert.category)}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-[#0A2540]">
                      {alert.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {alert.message}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {formatDateTime(alert.createdAt)} • ID: {alert.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {alert.actionUrl && (
                  <Link
                    href={alert.actionUrl}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#635BFF]"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => handleToggleRead(alert.id, !alert.isRead)}
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  {alert.isRead ? 'Mark Unread' : 'Mark Read'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

