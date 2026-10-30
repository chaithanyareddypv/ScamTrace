'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Building2,
  Bell,
  Palette,
  Users,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { formatDateShort } from '@/lib/utils';
import { useToast } from '@/components/ui/toast-provider';

interface UserProfileData {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department: string;
  notifyHighRisk: boolean;
  notifyCaseAssign: boolean;
  notifyEvidence: boolean;
  notifyRules: boolean;
  themePreference: string;
}

interface WorkspaceUserItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  department: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [users, setUsers] = useState<WorkspaceUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [notifyHighRisk, setNotifyHighRisk] = useState(true);
  const [notifyCaseAssign, setNotifyCaseAssign] = useState(true);
  const [notifyEvidence, setNotifyEvidence] = useState(true);
  const [notifyRules, setNotifyRules] = useState(false);
  const [themePreference, setThemePreference] = useState('light');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          setFullName(data.profile.fullName);
          setDepartment(data.profile.department);
          setNotifyHighRisk(data.profile.notifyHighRisk);
          setNotifyCaseAssign(data.profile.notifyCaseAssign);
          setNotifyEvidence(data.profile.notifyEvidence);
          setNotifyRules(data.profile.notifyRules);
          setThemePreference(data.profile.themePreference || 'light');
        }
        setUsers(data.users || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          department,
          notifyHighRisk,
          notifyCaseAssign,
          notifyEvidence,
          notifyRules,
          themePreference,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Failed to save settings',
          description: data.error || 'Error updating profile.',
          variant: 'error',
        });
        return;
      }
      toast({
        title: 'Workspace settings saved',
        description: 'Your profile and notification preferences have been updated.',
        variant: 'success',
      });
      loadSettings();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUserRole = async (
    targetUserId: string,
    updates: { targetUserRole?: string; targetUserActive?: boolean }
  ) => {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId,
        ...updates,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({
        title: 'Role update denied',
        description: data.error || 'Administrator privileges required.',
        variant: 'error',
      });
      return;
    }
    toast({
      title: 'User role updated',
      description: `${data.updatedUser.email} is now ${data.updatedUser.role}.`,
      variant: 'success',
    });
    loadSettings();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
          Workspace Settings & Role Governance
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage investigator profile details, workspace configuration, alert subscriptions, and server-side RBAC user permissions.
        </p>
      </div>

      {loading ? (
        <div className="radar-card p-10 text-center text-xs text-slate-400">
          Loading workspace configuration...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Profile, Notifications, Appearance */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-6 space-y-5 text-xs"
          >
            {/* Profile Settings */}
            <div className="radar-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <User className="w-4 h-4 text-[#635BFF]" />
                <h2 className="text-sm font-bold text-[#0A2540]">
                  Investigator Profile Settings
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Department / Unit
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">
                    Authenticated Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.email || ''}
                    className="w-full px-3 py-2 rounded border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">
                    Assigned RBAC Role
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.role || ''}
                    className="w-full px-3 py-2 rounded border border-slate-200 bg-indigo-50/50 text-[#635BFF] font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="radar-card p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Bell className="w-4 h-4 text-[#635BFF]" />
                <h2 className="text-sm font-bold text-[#0A2540]">
                  Alert & Notification Preferences
                </h2>
              </div>

              {[
                {
                  label: 'Critical & High-Risk Scam Analysis Triggers (Score ≥ 75)',
                  checked: notifyHighRisk,
                  onChange: setNotifyHighRisk,
                },
                {
                  label: 'Investigation Case Assignments & Status Escalations',
                  checked: notifyCaseAssign,
                  onChange: setNotifyCaseAssign,
                },
                {
                  label: 'Forensic Evidence Vault Integrity Additions',
                  checked: notifyEvidence,
                  onChange: setNotifyEvidence,
                },
                {
                  label: 'Detection Rule Weight & Heuristic Modifications',
                  checked: notifyRules,
                  onChange: setNotifyRules,
                },
              ].map((pref) => (
                <label
                  key={pref.label}
                  className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200/80 cursor-pointer"
                >
                  <span className="font-medium text-[#0A2540]">{pref.label}</span>
                  <input
                    type="checkbox"
                    checked={pref.checked}
                    onChange={(e) => pref.onChange(e.target.checked)}
                    className="rounded border-slate-300 text-[#635BFF] focus:ring-[#635BFF]"
                  />
                </label>
              ))}
            </div>

            {/* Appearance & Workspace Details */}
            <div className="radar-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Palette className="w-4 h-4 text-[#635BFF]" />
                <h2 className="text-sm font-bold text-[#0A2540]">
                  Appearance & Workspace Environment
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0A2540] mb-1">
                    Dashboard Surface Theme
                  </label>
                  <select
                    value={themePreference}
                    onChange={(e) => setThemePreference(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
                  >
                    <option value="light">Stripe Radar Light (Default)</option>
                    <option value="slate">High-Density Slate</option>
                    <option value="high-contrast">Accessible High Contrast</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">
                    Active Workspace Environment
                  </label>
                  <div className="px-3 py-2 rounded border border-slate-200 bg-slate-50 font-semibold text-[#0A2540] flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-[#635BFF]" />
                    <span>Demo Workspace (1,500+ Corpus)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#635BFF] hover:bg-[#5249E8] text-white font-semibold shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Right Column: Administrator User & Role Management */}
          <div className="lg:col-span-6 space-y-5 text-xs">
            <div className="radar-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#635BFF]" />
                  <div>
                    <h2 className="text-sm font-bold text-[#0A2540]">
                      User & Role Management (RBAC)
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Administrators can modify investigator roles and account status
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-indigo-50 text-[#635BFF]">
                  {users.length} Accounts
                </span>
              </div>

              <div className="space-y-2.5">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0A2540]">
                          {u.fullName}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-500">
                        {u.email}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {u.department} • Last login:{' '}
                        {u.lastLoginAt ? formatDateShort(u.lastLoginAt) : '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        disabled={profile?.role !== 'ADMINISTRATOR'}
                        onChange={(e) =>
                          handleUpdateUserRole(u.id, {
                            targetUserRole: e.target.value,
                          })
                        }
                        aria-label={`Role for ${u.email}`}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white disabled:opacity-60"
                      >
                        <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                        <option value="INVESTIGATOR">INVESTIGATOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#635BFF] shrink-0 mt-0.5" />
                <span>
                  <strong>Server-Side Role Enforcement:</strong> Role changes are verified on the server in `/api/settings` using `canPerformAction(user.role, &quot;MANAGE_USERS&quot;)`. Non-administrator requests receive HTTP `403 Forbidden`.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

