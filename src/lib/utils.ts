import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RiskLevel } from '@/types/scamtrace';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskLevelFromScore(score: number): RiskLevel {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped >= 75) return 'CRITICAL';
  if (clamped >= 50) return 'HIGH';
  if (clamped >= 25) return 'MEDIUM';
  return 'LOW';
}

export function getRiskBadgeClasses(level: string): string {
  switch (level.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-inset ring-rose-600/20';
    case 'HIGH':
      return 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-inset ring-amber-600/20';
    case 'MEDIUM':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-inset ring-indigo-600/20';
    case 'LOW':
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-inset ring-emerald-600/20';
  }
}

export function getStatusBadgeClasses(status: string): string {
  const s = status.toUpperCase();
  if (['RESOLVED', 'CLOSED', 'VERIFIED', 'MITIGATED', 'INTEGRITY_CHECKED'].includes(s)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (['UNDER_INVESTIGATION', 'INVESTIGATING', 'ACTIVE', 'TRIAGED'].includes(s)) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }
  if (['PENDING_REVIEW', 'PENDING_VERIFICATION', 'HELD_FOR_REVIEW', 'MONITORING'].includes(s)) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  if (['VERIFIED_SCAM', 'CRITICAL', 'FLAGGED', 'BLOCKED_DEMO'].includes(s)) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export function formatCategoryLabel(category: string): string {
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/\bUpi\b/g, 'UPI')
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bDns\b/g, 'DNS')
    .replace(/\bDom\b/g, 'DOM')
    .replace(/\bAch\b/g, 'ACH')
    .replace(/\bP2p\b/g, 'P2P');
}

export function formatDateShort(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, (ch) => (ch === '<' ? '&lt;' : '&gt;'))
    .trim();
}

export function toCsvContent(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escapeCsvCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    // Prevent CSV formula injection
    const safeStr = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return `"${safeStr}"`;
  };

  const headerLine = headers.map((h) => escapeCsvCell(h)).join(',');
  const dataLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(','));
  return [headerLine, ...dataLines].join('\n');
}

