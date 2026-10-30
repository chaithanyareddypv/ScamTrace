'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ScanSearch,
  FileWarning,
  Briefcase,
  Radar,
  Fingerprint,
  Network,
  Sliders,
  BarChart3,
  Bell,
  Lock,
  History,
  Settings,
  Search,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { ScamTraceLogo } from '@/components/brand/scamtrace-logo';
import { getRiskBadgeClasses } from '@/lib/utils';
import { useToast } from '@/components/ui/toast-provider';
import type { SessionUser } from '@/types/scamtrace';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const SIDEBAR_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/app', icon: LayoutDashboard },
  { label: 'Analyze Scam', href: '/app/analyze', icon: ScanSearch, badge: 'Core' },
  { label: 'Scam Reports', href: '/app/reports', icon: FileWarning },
  { label: 'Investigations', href: '/app/investigations', icon: Briefcase },
  { label: 'Threat Intelligence', href: '/app/threat-intelligence', icon: Radar },
  { label: 'Indicators', href: '/app/indicators', icon: Fingerprint },
  { label: 'Entity Network', href: '/app/entity-network', icon: Network },
  { label: 'Detection Rules', href: '/app/rules', icon: Sliders },
  { label: 'Risk Analytics', href: '/app/analytics', icon: BarChart3 },
  { label: 'Alerts', href: '/app/alerts', icon: Bell },
  { label: 'Evidence Vault', href: '/app/evidence', icon: Lock },
  { label: 'Audit Logs', href: '/app/audit-logs', icon: History },
  { label: 'Settings', href: '/app/settings', icon: Settings },
];

interface SearchResultsPayload {
  reports: Array<{
    id: string;
    reportNumber: string;
    title: string;
    category: string;
    riskLevel: string;
    riskScore: number;
  }>;
  investigations: Array<{
    id: string;
    caseNumber: string;
    title: string;
    riskLevel: string;
    riskScore: number;
    status: string;
  }>;
  indicators: Array<{
    id: string;
    value: string;
    type: string;
    riskLevel: string;
    riskScore: number;
  }>;
  evidence: Array<{
    id: string;
    evidenceCode: string;
    title: string;
    fileName: string;
    caseId: string;
  }>;
  transactions: Array<{
    id: string;
    referenceId: string;
    paymentRail: string;
    receiverHandle: string;
    amount: number;
    riskLevel: string;
  }>;
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  // Global search modal state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultsPayload | null>(null);

  // Help & documentation modal state
  const [helpOpen, setHelpOpen] = useState(false);

  const fetchMeAndAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUnreadAlerts(data.unreadAlertsCount ?? 0);
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  useEffect(() => {
    fetchMeAndAlerts();
  }, [fetchMeAndAlerts, pathname]);

  // Keyboard shortcut Ctrl+K / Cmd+K for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchOpen || searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    toast({
      title: 'Signed out',
      description: 'Your session has been securely terminated.',
    });
    router.push('/login');
    router.refresh();
  };

  const isNavItemActive = (href: string) => {
    if (href === '/app') {
      return pathname === '/app' || pathname === '/app/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-[#F7F9FC] text-[#0A2540]">
      {/* Desktop Left Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200/90 transition-all duration-200 no-print ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80">
          {!collapsed ? (
            <Link href="/app" className="focus:outline-none">
              <ScamTraceLogo size="sm" showSubtitle />
            </Link>
          ) : (
            <Link href="/app" className="mx-auto">
              <div className="w-8 h-8 rounded-lg bg-[#0A2540] flex items-center justify-center text-white font-bold text-xs">
                ST
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar width"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  active
                    ? 'bg-indigo-50/90 text-[#635BFF] font-semibold shadow-[inset_2px_0_0_0_#635BFF]'
                    : 'text-slate-600 hover:text-[#0A2540] hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active
                        ? 'text-[#635BFF]'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-100 text-indigo-700">
                    {item.badge}
                  </span>
                )}
                {!collapsed && item.href === '/app/alerts' && unreadAlerts > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                    {unreadAlerts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Workspace Footer */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/60">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#0A2540] truncate">
                  {user.fullName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user.role}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-full bg-white h-full flex flex-col z-10 shadow-xl">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
              <ScamTraceLogo size="sm" showSubtitle />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium ${
                      active
                        ? 'bg-indigo-50 text-[#635BFF] font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full max-w-md flex items-center justify-between px-3 py-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-md transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Search reports, cases, indicators, UPI, or UTR...</span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-white border border-slate-200 rounded">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Top Bar Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Environment Indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50/80 border border-indigo-200/70 text-[11px] font-medium text-indigo-700">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              <span>Demo Workspace</span>
            </div>

            {/* Notification Center Link */}
            <Link
              href="/app/alerts"
              className="relative p-2 rounded-md text-slate-500 hover:text-[#0A2540] hover:bg-slate-100 transition-colors"
              title="Alert & Notification Center"
              aria-label="Alerts and Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadAlerts > 99 ? '99+' : unreadAlerts}
                </span>
              )}
            </Link>

            {/* Help & Documentation Trigger */}
            <button
              onClick={() => setHelpOpen(true)}
              className="p-2 rounded-md text-slate-500 hover:text-[#0A2540] hover:bg-slate-100 transition-colors"
              title="Platform Documentation & Explainability Guide"
              aria-label="Help and Documentation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5">
              <Link
                href="/app/settings"
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: user.avatarColor || '#4F46E5' }}
                >
                  {user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-[#0A2540]">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] font-medium text-indigo-600">
                    {user.role}
                  </span>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 no-print">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-10">
            <div className="flex items-center px-4 py-3 border-b border-slate-200 gap-3">
              <Search className="w-4 h-4 text-indigo-600 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across Scam Reports, Investigations, Indicators, Evidence, or Transactions..."
                className="w-full text-sm text-[#0A2540] placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4 space-y-4">
              {searchQuery.trim().length < 2 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    Type at least 2 characters to search across the 1,500+ synthetic records.
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                    {[
                      'RPT-2026-0001',
                      'CASE-2026-0001',
                      'paypa1',
                      'refund.claim',
                      'UTR-MULE',
                      'EVD-2026-0001',
                    ].map((sample) => (
                      <button
                        key={sample}
                        onClick={() => setSearchQuery(sample)}
                        className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded border border-slate-200 transition-colors"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Searching ScamTrace database...
                </div>
              ) : searchResults ? (
                <div className="space-y-4">
                  {/* Indicators */}
                  {searchResults.indicators.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Suspicious Indicators ({searchResults.indicators.length})
                      </h4>
                      <div className="space-y-1">
                        {searchResults.indicators.map((ind) => (
                          <Link
                            key={ind.id}
                            href={`/app/indicators?highlight=${encodeURIComponent(ind.id)}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="text-xs font-mono font-medium text-[#0A2540] truncate">
                                {ind.value}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {ind.id} • {ind.type}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded border shrink-0 ${getRiskBadgeClasses(
                                ind.riskLevel
                              )}`}
                            >
                              {ind.riskScore}/100 {ind.riskLevel}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scam Reports */}
                  {searchResults.reports.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Scam Reports ({searchResults.reports.length})
                      </h4>
                      <div className="space-y-1">
                        {searchResults.reports.map((r) => (
                          <Link
                            key={r.id}
                            href={`/app/reports?reportId=${encodeURIComponent(r.id)}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="text-xs font-medium text-[#0A2540] truncate">
                                {r.reportNumber}: {r.title}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Category: {r.category}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded border shrink-0 ${getRiskBadgeClasses(
                                r.riskLevel
                              )}`}
                            >
                              {r.riskScore}/100
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Investigation Cases */}
                  {searchResults.investigations.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Investigation Cases ({searchResults.investigations.length})
                      </h4>
                      <div className="space-y-1">
                        {searchResults.investigations.map((c) => (
                          <Link
                            key={c.id}
                            href={`/app/investigations?caseId=${encodeURIComponent(c.id)}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="text-xs font-medium text-[#0A2540] truncate">
                                {c.caseNumber}: {c.title}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Status: {c.status}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded border shrink-0 ${getRiskBadgeClasses(
                                c.riskLevel
                              )}`}
                            >
                              {c.riskLevel}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evidence */}
                  {searchResults.evidence.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Forensic Evidence ({searchResults.evidence.length})
                      </h4>
                      <div className="space-y-1">
                        {searchResults.evidence.map((ev) => (
                          <Link
                            key={ev.id}
                            href={`/app/evidence?q=${encodeURIComponent(ev.evidenceCode)}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="text-xs font-medium text-[#0A2540] truncate">
                                {ev.evidenceCode}: {ev.title}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                File: {ev.fileName} • Case: {ev.caseId}
                              </p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transactions */}
                  {searchResults.transactions.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Transaction References ({searchResults.transactions.length})
                      </h4>
                      <div className="space-y-1">
                        {searchResults.transactions.map((tx) => (
                          <Link
                            key={tx.id}
                            href={`/app/analyze?type=TRANSACTION&input=${encodeURIComponent(tx.referenceId)}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="text-xs font-mono font-medium text-[#0A2540] truncate">
                                {tx.referenceId} (${tx.amount})
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {tx.paymentRail} → {tx.receiverHandle}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded border shrink-0 ${getRiskBadgeClasses(
                                tx.riskLevel
                              )}`}
                            >
                              {tx.riskLevel}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.indicators.length === 0 &&
                    searchResults.reports.length === 0 &&
                    searchResults.investigations.length === 0 &&
                    searchResults.evidence.length === 0 &&
                    searchResults.transactions.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No matching records found for &ldquo;{searchQuery}&rdquo;.
                      </div>
                    )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Help & Documentation Modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setHelpOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden z-10">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#635BFF]" />
                <h3 className="text-base font-bold text-[#0A2540]">
                  ScamTrace Explainability & Investigator Guide
                </h3>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-600 leading-relaxed">
              <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200/80 text-indigo-950">
                <p className="font-semibold mb-1">
                  How Explainable Risk Scoring Works (0 – 100 Scale)
                </p>
                <p>
                  Every submitted URL, email, phone number, message, UPI VPA, or transaction reference is normalized safely and evaluated against 24 deterministic rules plus the synthetic Threat Intelligence corpus:
                </p>
                <p className="font-mono text-[11px] bg-white px-2.5 py-1.5 rounded border border-indigo-200 mt-2">
                  RiskScore = min(100, round((RuleWeightsSum + ThreatIntelBonus) × MultiSignalMultiplier))
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded border border-emerald-200 bg-emerald-50/50">
                  <p className="font-bold text-emerald-800">0–24: LOW</p>
                  <p className="text-[11px] text-emerald-700">
                    Minimal or no heuristic triggers.
                  </p>
                </div>
                <div className="p-2.5 rounded border border-indigo-200 bg-indigo-50/50">
                  <p className="font-bold text-indigo-800">25–49: MEDIUM</p>
                  <p className="text-[11px] text-indigo-700">
                    Single anomalous indicator; verify out-of-band.
                  </p>
                </div>
                <div className="p-2.5 rounded border border-amber-200 bg-amber-50/50">
                  <p className="font-bold text-amber-800">50–74: HIGH</p>
                  <p className="text-[11px] text-amber-700">
                    Multiple corroborated scam indicators.
                  </p>
                </div>
                <div className="p-2.5 rounded border border-rose-200 bg-rose-50/50">
                  <p className="font-bold text-rose-800">75–100: CRITICAL</p>
                  <p className="text-[11px] text-rose-700">
                    High-severity fraud pattern or corpus match.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[#0A2540] mb-1 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  Role-Based Access Control (RBAC)
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Administrator</strong>: Full access including Detection Rule weight calibration and User Role administration.
                  </li>
                  <li>
                    <strong>Investigator</strong>: Can run analyses, create/edit Scam Reports, manage Investigation Cases, upload Forensic Evidence, and export CSV/Printable reports.
                  </li>
                  <li>
                    <strong>Viewer</strong>: Read-only audit access + sandboxed Scam Analysis execution.
                  </li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                <p className="font-semibold text-[#0A2540]">
                  Responsible Use & Safety Notice
                </p>
                <p className="mt-0.5">
                  ScamTrace never visits or executes untrusted URLs. All seeded indicators use synthetic `.example` / `.test` domains and fictional identifiers. A high risk score is an investigative signal, not legal proof of criminal activity.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

