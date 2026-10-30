'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  formatCategoryLabel,
  formatDateShort,
  getRiskBadgeClasses,
} from '@/lib/utils';
import { useToast } from '@/components/ui/toast-provider';
import type { AnalysisInputType, ExplainableAnalysisOutput } from '@/types/scamtrace';

interface DetectionRuleItem {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  targetTypes: string;
  severity: string;
  scoreWeight: number;
  maxWeight: number;
  isActive: boolean;
  matchCount: number;
  precisionEstimate: number;
  patternConfigJson: string;
  explanationTemplate: string;
  lastTriggeredAt: string | null;
}

export default function DetectionRulesPage() {
  const { toast } = useToast();

  const [rules, setRules] = useState<DetectionRuleItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Rule Testing Sandbox state
  const [testInputType, setTestInputType] = useState<AnalysisInputType>('MESSAGE');
  const [testSample, setTestSample] = useState(
    'URGENT: Your account will be blocked within 24 hours. Share OTP and approve collect request refund.claim0001@sandboxupi immediately.'
  );
  const [testingRule, setTestingRule] = useState(false);
  const [testResult, setTestResult] = useState<ExplainableAnalysisOutput | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleUpdateRule = async (
    id: string,
    updates: { isActive?: boolean; scoreWeight?: number }
  ) => {
    setSavingId(id);
    try {
      const res = await fetch('/api/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Cannot modify rule',
          description: data.error || 'Administrator privileges required.',
          variant: 'error',
        });
        return;
      }

      setRules((prev) =>
        prev.map((r) => (r.id === id ? data.rule : r))
      );
      toast({
        title: `Rule ${data.rule.code} Updated`,
        description: `Active: ${data.rule.isActive} • Weight: +${data.rule.scoreWeight} pts`,
        variant: 'success',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingRule(true);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: testInputType,
          sampleInput: testSample,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(data.testResult);
        toast({
          title: `Simulation Score: ${data.testResult.riskScore}/100`,
          description: `${data.testResult.triggeredFactors.length} active rule(s) matched.`,
        });
      }
    } finally {
      setTestingRule(false);
    }
  };

  const filteredRules =
    categoryFilter === 'ALL'
      ? rules
      : rules.filter((r) => r.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
              Explainable Detection Rule Management
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-50 text-[#635BFF] border border-indigo-200">
              {rules.filter((r) => r.isActive).length} / {rules.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect rule logic, calibrate score weights (5–45 pts), toggle active heuristics, and simulate rule performance on synthetic payloads.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-md border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-[#635BFF] shrink-0" />
          <span>Deterministic Config Only: Arbitrary code execution is strictly prohibited</span>
        </div>
      </div>

      {/* Interactive Rule Simulation & Test Bench */}
      <div className="radar-card p-5 space-y-4 bg-gradient-to-br from-white to-indigo-50/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0A2540] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#635BFF]" />
              <span>Live Rule Calibration & Test Bench</span>
            </h2>
            <p className="text-xs text-slate-500">
              Test how enabling/disabling rules or adjusting weights below impacts the explainable risk score in real time.
            </p>
          </div>
        </div>

        <form onSubmit={handleRunSimulation} className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-2">
            <select
              value={testInputType}
              onChange={(e) => setTestInputType(e.target.value as AnalysisInputType)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-md border border-slate-300 bg-white"
            >
              <option value="MESSAGE">Message</option>
              <option value="URL">URL</option>
              <option value="UPI">UPI Handle</option>
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
              <option value="TRANSACTION">Transaction</option>
            </select>
          </div>
          <div className="lg:col-span-8">
            <input
              type="text"
              value={testSample}
              onChange={(e) => setTestSample(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-slate-300 bg-white"
            />
          </div>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={testingRule}
              className="w-full py-2 px-4 rounded-md bg-[#635BFF] hover:bg-[#5249E8] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{testingRule ? 'Testing...' : 'Test Rules'}</span>
            </button>
          </div>
        </form>

        {testResult && (
          <div className="p-3.5 rounded-lg bg-white border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-[#0A2540]">
                Simulation Result: {testResult.riskScore}/100 ({testResult.riskLevel})
              </p>
              <p className="text-slate-600">
                Matched Rules:{' '}
                {testResult.triggeredFactors.length > 0
                  ? testResult.triggeredFactors
                      .map((f) => `${f.ruleCode} (+${f.scoreContribution} pts)`)
                      .join(', ')
                  : 'None'}
              </p>
            </div>
            <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200 shrink-0">
              {testResult.scoreCalculationBreakdown.formulaDescription}
            </span>
          </div>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'ALL', label: 'All Categories' },
          { id: 'DOMAIN_IMPERSONATION', label: 'Domain Impersonation' },
          { id: 'URL_STRUCTURE', label: 'URL Structure' },
          { id: 'CREDENTIAL_HARVEST', label: 'Credential Harvest' },
          { id: 'URGENCY_COERCION', label: 'Urgency & Coercion' },
          { id: 'PAYMENT_ANOMALY', label: 'Payment & UPI Anomaly' },
          { id: 'SENDER_REPUTATION', label: 'Sender Reputation' },
          { id: 'THREAT_INTEL_MATCH', label: 'Threat Intel Match' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
              categoryFilter === cat.id
                ? 'bg-[#0A2540] text-white border-[#0A2540]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Rules Catalog Table */}
      <div className="radar-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Rule Code & Name</th>
                <th className="py-3 px-4">Category & Targets</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Score Weight (5–45)</th>
                <th className="py-3 px-4">Performance</th>
                <th className="py-3 px-4">Last Triggered</th>
                <th className="py-3 px-4 text-right">Status (Admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading explainable detection rules...
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr
                    key={rule.id}
                    className={`hover:bg-slate-50/80 ${
                      !rule.isActive ? 'opacity-60 bg-slate-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 max-w-md">
                      <span className="font-mono font-bold text-[#635BFF] block">
                        {rule.code}
                      </span>
                      <p className="font-bold text-[#0A2540] mt-0.5">
                        {rule.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {rule.description}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 block w-fit mb-1">
                        {formatCategoryLabel(rule.category)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Targets: {rule.targetTypes}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                          rule.severity
                        )}`}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          max={rule.maxWeight}
                          disabled={savingId === rule.id}
                          defaultValue={rule.scoreWeight}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val !== rule.scoreWeight && val >= 5 && val <= 45) {
                              handleUpdateRule(rule.id, { scoreWeight: val });
                            }
                          }}
                          aria-label={`Score weight for ${rule.code}`}
                          className="w-16 px-2 py-1 font-mono font-bold text-xs rounded border border-slate-300 bg-white"
                        />
                        <span className="text-[11px] text-slate-400">
                          / {rule.maxWeight} pts
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-[#0A2540]">
                        {rule.matchCount.toLocaleString()} matches
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Est. Precision: {Math.round(rule.precisionEstimate * 100)}%
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {rule.lastTriggeredAt
                        ? formatDateShort(rule.lastTriggeredAt)
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={savingId === rule.id}
                        onClick={() =>
                          handleUpdateRule(rule.id, { isActive: !rule.isActive })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                          rule.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {rule.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Footnote */}
      <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Server-Side Governance:</strong> Modifying rule weights or enabling/disabling rules requires <strong>ADMINISTRATOR</strong> role privileges and generates an immutable record in `/app/audit-logs`.
        </span>
      </div>
    </div>
  );
}

