'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radar,
  TrendingUp,
  AlertTriangle,
  Fingerprint,
  MessageSquareWarning,
  CreditCard,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  formatCategoryLabel,
  getRiskBadgeClasses,
} from '@/lib/utils';

interface ThreatPatternItem {
  id: string;
  code: string;
  name: string;
  category: string;
  severity: string;
  description: string;
  commonTacticsJson: string;
  targetPersona: string;
  detectionCount: number;
  weeklyGrowthPct: number;
  confidenceLimitation: string;
  sourceLabel: string;
  isEmerging: boolean;
  _count?: { indicators: number };
}

interface RepeatedIndicatorItem {
  id: string;
  value: string;
  type: string;
  category: string;
  riskScore: number;
  riskLevel: string;
  associationCount: number;
  summaryReason: string;
  threatPattern?: { code: string; name: string } | null;
  investigationCase?: { id: string; caseNumber: string } | null;
}

interface MessageSampleItem {
  id: string;
  sampleCode: string;
  channel: string;
  senderIdentifier: string;
  subject: string | null;
  content: string;
  category: string;
  riskScore: number;
  riskLevel: string;
  linguisticSignalsJson: string;
  explanation: string;
}

interface TransactionSampleItem {
  id: string;
  referenceId: string;
  paymentRail: string;
  senderHandle: string;
  receiverHandle: string;
  merchantDisplayName: string;
  amount: number;
  riskScore: number;
  riskLevel: string;
  status: string;
  scamCategory: string;
  explanation: string;
}

export default function ThreatIntelligencePage() {
  const [patterns, setPatterns] = useState<ThreatPatternItem[]>([]);
  const [repeatedIndicators, setRepeatedIndicators] = useState<RepeatedIndicatorItem[]>([]);
  const [messageSamples, setMessageSamples] = useState<MessageSampleItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionSampleItem[]>([]);
  const [filterEmerging, setFilterEmerging] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/threat-intelligence')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setPatterns(d.patterns || []);
          setRepeatedIndicators(d.repeatedIndicators || []);
          setMessageSamples(d.messageSamples || []);
          setTransactions(d.recentTransactions || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const displayedPatterns = filterEmerging
    ? patterns.filter((p) => p.isEmerging)
    : patterns;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
              Threat Intelligence & Scam Archetypes
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-50 text-[#635BFF] border border-indigo-200">
              Synthetic Intelligence Corpus v2.4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyze emerging scam categories, repeated high-association indicators, linguistic lures, and payment settlement patterns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterEmerging(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              !filterEmerging
                ? 'bg-[#635BFF] text-white border-[#635BFF]'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            All Patterns ({patterns.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterEmerging(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              filterEmerging
                ? 'bg-[#635BFF] text-white border-[#635BFF]'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
            Emerging Threats Only
          </button>
        </div>
      </div>

      {/* Synthetic Intelligence Transparency Banner */}
      <div className="radar-card p-4 bg-amber-50/50 border-amber-200/80 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-[#0A2540]">
            Source Classification & Confidence Limitation Disclosure
          </p>
          <p className="text-slate-600 mt-0.5">
            All intelligence cards, indicators, message samples, and transaction events displayed on this page are derived from the deterministic <strong>ScamTrace Synthetic Intelligence Corpus v2.4</strong> (1,500+ database records). They are modeled for explainable cybersecurity investigation and academic demonstration, not presented as live external threat feeds.
          </p>
        </div>
      </div>

      {/* Pattern Frequency & Growth Chart */}
      <div className="radar-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#0A2540]">
            Most Frequently Detected Scam Patterns & Weekly Growth (%)
          </h2>
          <p className="text-xs text-slate-500">
            Comparison of detection volume vs. week-over-week growth velocity across seeded scam archetypes
          </p>
        </div>

        <div className="h-72 w-full">
          {patterns.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patterns.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="code"
                  tick={{ fontSize: 10, fill: '#0A2540' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    fontSize: '12px',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="detectionCount"
                  name="Total Corpus Detections"
                  fill="#635BFF"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="weeklyGrowthPct"
                  name="Weekly Growth (%)"
                  fill="#00D4B6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              {loading ? 'Loading intelligence telemetry...' : 'No pattern data.'}
            </div>
          )}
        </div>
      </div>

      {/* Threat Intelligence Pattern Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedPatterns.map((pat) => {
          let tactics: string[] = [];
          try {
            tactics = JSON.parse(pat.commonTacticsJson);
          } catch {
            tactics = [];
          }
          return (
            <div
              key={pat.id}
              className="radar-card p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[#0A2540] text-white">
                        {pat.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                          pat.severity
                        )}`}
                      >
                        {pat.severity}
                      </span>
                      {pat.isEmerging && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800">
                          Emerging Trend
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-[#0A2540] mt-1.5">
                      {pat.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-mono font-bold text-[#635BFF]">
                      {pat.detectionCount} hits
                    </span>
                    <p className="text-[10px] text-rose-600 font-semibold">
                      {pat.weeklyGrowthPct >= 0 ? '+' : ''}
                      {pat.weeklyGrowthPct}% / wk
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {pat.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tactics.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 text-[11px] rounded bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                <div className="flex items-center justify-between">
                  <span>
                    <strong>Target Persona:</strong> {pat.targetPersona}
                  </span>
                  <span>
                    <strong>Source:</strong> {pat.sourceLabel}
                  </span>
                </div>
                <p className="text-slate-400 italic">
                  <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-500" />
                  Limitation: {pat.confidenceLimitation}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Repeated Entities & Associated Characteristics (Messages + Transactions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Repeated Entities */}
        <div className="radar-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0A2540] flex items-center gap-1.5">
              <Fingerprint className="w-4 h-4 text-[#635BFF]" />
              <span>Repeated High-Association Entities</span>
            </h3>
            <Link
              href="/app/indicators"
              className="text-xs font-semibold text-[#635BFF] hover:underline"
            >
              All 820 →
            </Link>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {repeatedIndicators.map((ind) => (
              <div
                key={ind.id}
                className="p-2.5 rounded border border-slate-200 bg-slate-50/60 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase text-indigo-600">
                    [{ind.type}] {ind.id}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800">
                    {ind.associationCount} linked records
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-[#0A2540] truncate">
                  {ind.value}
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  {ind.summaryReason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Suspicious Message Samples */}
        <div className="radar-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0A2540] flex items-center gap-1.5">
              <MessageSquareWarning className="w-4 h-4 text-amber-600" />
              <span>Cataloged Lure Message Samples (160)</span>
            </h3>
          </div>
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {messageSamples.map((msg) => (
              <div
                key={msg.id}
                className="p-3 rounded border border-slate-200 bg-slate-50/60 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-[#635BFF]">
                    {msg.sampleCode} ({msg.channel})
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                      msg.riskLevel
                    )}`}
                  >
                    {msg.riskScore}/100
                  </span>
                </div>
                <p className="font-semibold text-[#0A2540] truncate">
                  {msg.subject}
                </p>
                <p className="text-[11px] text-slate-600 font-mono bg-white p-2 rounded border border-slate-200/80 line-clamp-3">
                  {msg.content}
                </p>
                <Link
                  href={`/app/analyze`}
                  className="inline-block text-[11px] font-semibold text-[#635BFF] hover:underline"
                >
                  Inspect Linguistic Signals →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Synthetic Transaction Records */}
        <div className="radar-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0A2540] flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-rose-600" />
              <span>Flagged Synthetic Transactions (160)</span>
            </h3>
          </div>
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded border border-slate-200 bg-slate-50/60 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#0A2540]">
                    {tx.referenceId}
                  </span>
                  <span className="font-mono font-bold text-rose-600">
                    ${tx.amount.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  <strong>{tx.paymentRail}</strong> →{' '}
                  <span className="font-mono">{tx.receiverHandle}</span>
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-2">
                  <ShieldAlert className="w-3 h-3 inline mr-1 text-rose-500" />
                  {tx.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

