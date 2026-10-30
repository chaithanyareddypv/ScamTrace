'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Mail,
  Phone,
  MessageSquareWarning,
  Wallet,
  ReceiptText,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  FilePlus2,
  Sparkles,
  Scale,
  Calculator,
  Clock,
} from 'lucide-react';
import {
  formatDateTime,
  getRiskBadgeClasses,
} from '@/lib/utils';
import { useToast } from '@/components/ui/toast-provider';
import type {
  AnalysisInputType,
  ExplainableAnalysisOutput,
} from '@/types/scamtrace';

interface InputModeOption {
  type: AnalysisInputType;
  label: string;
  placeholder: string;
  helperText: string;
  icon: React.ComponentType<{ className?: string }>;
  presets: Array<{ label: string; value: string; riskHint: string }>;
}

const ANALYSIS_MODES: InputModeOption[] = [
  {
    type: 'URL',
    label: 'URL Analysis',
    placeholder: 'https://hdfc-kyc-update-0001.example/verify-kyc/login?ref=cmp_1',
    helperText:
      'Analyzes URL lexical structure, brand typosquatting, punycode, TLD risk, and credential harvesting paths locally without visiting the URL.',
    icon: Globe,
    presets: [
      {
        label: 'Critical KYC Typosquat URL',
        value: 'http://hdfc-kyc-update-0001.example/verify-kyc/login?ref=cmp_1',
        riskHint: 'Critical',
      },
      {
        label: 'Punycode Homograph Wallet Lure',
        value: 'https://xn--binance-claim-99a.xyz/wallet-connect/validate-otp?token=881',
        riskHint: 'Critical',
      },
      {
        label: 'Benign Documentation URL',
        value: 'https://docs.university-research.example.org/syllabus/2026',
        riskHint: 'Low',
      },
    ],
  },
  {
    type: 'MESSAGE',
    label: 'Message Analysis',
    placeholder:
      'Paste suspicious SMS, WhatsApp, Telegram, recruitment, parcel delivery, or investment message text...',
    helperText:
      'Evaluates coercive urgency, OTP/PIN solicitation, task-scam scripts, parcel redelivery lures, guaranteed ROI claims, and embedded indicators.',
    icon: MessageSquareWarning,
    presets: [
      {
        label: 'Bank KYC + OTP Coercion SMS',
        value:
          'FINAL NOTICE: Your account will be blocked within 24 hours due to expired KYC. Immediately enter your OTP and confirm your PIN at https://sbi-online-portal-0005.example/verify-kyc/login or call +91-99990-00005.',
        riskHint: 'Critical',
      },
      {
        label: 'Telegram VIP Task Job Scam',
        value:
          'Hello! Earn $350 per day working from home with no experience needed. Simply rate Google Maps locations and join our VIP task group after paying a small refundable registration fee.',
        riskHint: 'High',
      },
      {
        label: 'Parcel Customs Redelivery Scam',
        value:
          'DHL Alert: Your package could not be delivered today due to an incomplete address and customs duty pending. Pay redelivery fee immediately at https://dhl-customs-clearance-0008.example/customs-duty/pay-invoice',
        riskHint: 'Critical',
      },
    ],
  },
  {
    type: 'UPI',
    label: 'UPI Identifier Analysis',
    placeholder: 'refund.claim0001@sandboxupi',
    helperText:
      'Inspects Virtual Payment Addresses (VPAs) for deceptive refund/cashback handles, collect-request traps, and unrecognized synthetic PSP suffixes.',
    icon: Wallet,
    presets: [
      {
        label: 'Deceptive Refund Collect VPA',
        value: 'refund.claim0001@sandboxupi',
        riskHint: 'Critical',
      },
      {
        label: 'KYC Unblock Desk Handle',
        value: 'customercare.unblock0012@tempbank',
        riskHint: 'High',
      },
      {
        label: 'Standard Merchant Handle',
        value: 'campus.bookstore@oksbi',
        riskHint: 'Low',
      },
    ],
  },
  {
    type: 'EMAIL',
    label: 'Email Analysis',
    placeholder: 'security-alert.0001@paypa1-secure.example',
    helperText:
      'Evaluates sender local-part entropy, authoritative brand role prefixes paired with lookalike domains, and embedded phishing headers.',
    icon: Mail,
    presets: [
      {
        label: 'Spoofed Security Desk Email',
        value: 'security-alert.0001@paypa1-secure.example',
        riskHint: 'Critical',
      },
      {
        label: 'High-Entropy Bulk Sender',
        value: 'compliance-desk-994821@verify-notice-alert.test',
        riskHint: 'High',
      },
      {
        label: 'Normal Academic Email',
        value: 'faculty.advisor@cs-department.edu',
        riskHint: 'Low',
      },
    ],
  },
  {
    type: 'PHONE',
    label: 'Phone Number Analysis',
    placeholder: '+1-555-010001',
    helperText:
      'Checks phone numbers against flagged virtual VoIP blocks, sequential burner allocations, and historical vishing reports.',
    icon: Phone,
    presets: [
      {
        label: 'Seeded VoIP Vishing Number',
        value: '+1-555-010001',
        riskHint: 'Critical',
      },
      {
        label: 'Burner Sequential Helpline',
        value: '+91-99990-00003',
        riskHint: 'High',
      },
      {
        label: 'Standard Office Line',
        value: '+1-212-736-3100',
        riskHint: 'Low',
      },
    ],
  },
  {
    type: 'TRANSACTION',
    label: 'Transaction Reference Analysis',
    placeholder: 'UTR-MULE-20260001',
    helperText:
      'Examines transaction references and payment descriptors for mule dispersion prefixes, unauthorized pull markers, and fake escrow memos.',
    icon: ReceiptText,
    presets: [
      {
        label: 'Flagged Mule Settlement UTR',
        value: 'UTR-MULE-20260001 (escrow refundable-deposit unlock-fee)',
        riskHint: 'High',
      },
      {
        label: 'Reverse Collect Pull Reference',
        value: 'REV-COLLECT-20260015 tax-clearance',
        riskHint: 'High',
      },
      {
        label: 'Routine Invoice Reference',
        value: 'INV-2026-884120',
        riskHint: 'Low',
      },
    ],
  },
];

interface HistoricalAnalysisItem {
  id: string;
  inputType: string;
  rawInput: string;
  riskScore: number;
  riskLevel: string;
  heuristicConfidence: number;
  verdictSummary: string;
  createdAt: string;
}

export default function AnalyzeScamPage() {
  const { toast } = useToast();

  const [selectedMode, setSelectedMode] = useState<AnalysisInputType>('URL');
  const [rawInput, setRawInput] = useState(
    'http://hdfc-kyc-update-0001.example/verify-kyc/login?ref=cmp_1'
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ExplainableAnalysisOutput | null>(null);
  const [history, setHistory] = useState<HistoricalAnalysisItem[]>([]);
  const [creatingReport, setCreatingReport] = useState(false);

  const currentModeConfig =
    ANALYSIS_MODES.find((m) => m.type === selectedMode) || ANALYSIS_MODES[0];

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/analyze');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.analyses || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (rawInput.trim().length < 3) {
      toast({
        title: 'Input too short',
        description: 'Please enter at least 3 characters to analyze.',
        variant: 'error',
      });
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: selectedMode,
          rawInput: rawInput.trim(),
          saveToDatabase: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Analysis failed',
          description: data.error || 'Could not evaluate indicator.',
          variant: 'error',
        });
        return;
      }

      setResult(data.result);
      loadHistory();
      toast({
        title: `Analysis Complete: ${data.result.riskScore}/100 (${data.result.riskLevel})`,
        description: `Evaluated ${data.result.evaluatedRulesCount} rules; ${data.result.triggeredFactors.length} factor(s) triggered.`,
        variant: data.result.riskScore >= 50 ? 'error' : 'success',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Run initial preset analysis automatically on mount so the user sees a complete explainable breakdown immediately
  useEffect(() => {
    handleAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEscalateToReport = async () => {
    if (!result) return;
    setCreatingReport(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Escalated ${result.inputType} Analysis (${result.riskLevel} Risk - ${result.riskScore}/100)`,
          category:
            result.inputType === 'UPI'
              ? 'UPI_FRAUD'
              : result.inputType === 'TRANSACTION'
              ? 'PAYMENT_REQUEST'
              : 'PHISHING',
          description: `${result.verdictSummary} ${result.detailedExplanation}`,
          submittedIndicatorValue: result.rawInput,
          submittedIndicatorType: result.inputType,
          financialLossAmount: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Could not escalate report',
          description: data.error || 'Permission denied',
          variant: 'error',
        });
        return;
      }
      toast({
        title: `Created Report ${data.report.reportNumber}`,
        description: 'Analysis findings have been logged in Scam Reports.',
        variant: 'success',
      });
    } finally {
      setCreatingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
              Explainable Scam Analysis Engine
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-50 text-[#635BFF] border border-indigo-200">
              Rule-Based v2.4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Static, sandboxed inspection of suspicious URLs, messages, emails, phone numbers, UPI handles, and transaction references.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-md border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Safe Static Parsing: Untrusted URLs are never visited or executed</span>
        </div>
      </div>

      {/* 6 Analysis Mode Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {ANALYSIS_MODES.map((m) => {
          const Icon = m.icon;
          const active = selectedMode === m.type;
          return (
            <button
              key={m.type}
              type="button"
              onClick={() => {
                setSelectedMode(m.type);
                setRawInput(m.presets[0].value);
              }}
              className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 ${
                active
                  ? 'bg-white border-[#635BFF] ring-2 ring-indigo-500/15 shadow-xs'
                  : 'bg-white/70 border-slate-200/90 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon
                  className={`w-4 h-4 ${
                    active ? 'text-[#635BFF]' : 'text-slate-400'
                  }`}
                />
                {active && (
                  <span className="w-2 h-2 rounded-full bg-[#635BFF]" />
                )}
              </div>
              <span
                className={`text-xs font-semibold ${
                  active ? 'text-[#0A2540]' : 'text-slate-600'
                }`}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Input Form & Presets Card */}
      <div className="radar-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#0A2540]">
              Submit {currentModeConfig.label} Payload
            </h2>
            <p className="text-xs text-slate-500">
              {currentModeConfig.helperText}
            </p>
          </div>

          {/* Preset Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1">
              Test Samples:
            </span>
            {currentModeConfig.presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setRawInput(preset.value)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-[#635BFF] text-slate-700 border border-slate-200 transition-colors"
              >
                <Sparkles className="w-3 h-3 inline mr-1 text-indigo-500" />
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-3">
          {selectedMode === 'MESSAGE' ? (
            <textarea
              rows={4}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={currentModeConfig.placeholder}
              className="w-full p-3 text-xs font-mono rounded-md border border-slate-300 focus:border-[#635BFF] focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          ) : (
            <input
              type="text"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={currentModeConfig.placeholder}
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-md border border-slate-300 focus:border-[#635BFF] focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              Evaluates 24 weighted heuristic rules + 820 synthetic threat intelligence indicators.
            </p>
            <button
              type="submit"
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#635BFF] hover:bg-[#5249E8] disabled:opacity-60 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <ScanSearch className="w-4 h-4" />
              <span>
                {analyzing ? 'Evaluating Rules...' : 'Run Explainable Analysis'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Explainable Analysis Result Section */}
      {result && (
        <div className="space-y-5">
          {/* Top Verdict Banner & Score vs Confidence Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Risk Score Gauge & Verdict Summary */}
            <div className="lg:col-span-8 radar-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  {result.riskScore >= 50 ? (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-[#0A2540]">
                      Explainable Assessment Verdict
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Analysis ID: {result.id || 'LIVE-EVAL'} • Engine: {result.engineVersion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-md border ${getRiskBadgeClasses(
                      result.riskLevel
                    )}`}
                  >
                    {result.riskLevel} RISK ({result.riskScore} / 100)
                  </span>
                  <button
                    type="button"
                    onClick={handleEscalateToReport}
                    disabled={creatingReport}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540]"
                  >
                    <FilePlus2 className="w-3.5 h-3.5 text-[#635BFF]" />
                    <span>
                      {creatingReport ? 'Logging...' : 'Escalate to Scam Report'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <p className="text-xs font-bold text-[#0A2540]">
                  {result.verdictSummary}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {result.detailedExplanation}
                </p>
              </div>

              {/* Risk Meter Bar (0 - 100 with 4 tier markers) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-emerald-700">0–24 Low</span>
                  <span className="text-indigo-700">25–49 Medium</span>
                  <span className="text-amber-700">50–74 High</span>
                  <span className="text-rose-700">75–100 Critical</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      result.riskScore >= 75
                        ? 'bg-rose-600'
                        : result.riskScore >= 50
                        ? 'bg-amber-500'
                        : result.riskScore >= 25
                        ? 'bg-indigo-600'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(4, result.riskScore)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Score Calculation Breakdown & Confidence Separation */}
            <div className="lg:col-span-4 radar-card p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#635BFF]" />
                  <h3 className="text-sm font-bold text-[#0A2540]">
                    Score Calculation Breakdown
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Reproducible mathematical derivation
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Triggered Rule Weights Sum:</span>
                  <span className="font-mono font-semibold text-[#0A2540]">
                    +{result.scoreCalculationBreakdown.rawRuleSum} pts
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Threat Intel Corpus Bonus:</span>
                  <span className="font-mono font-semibold text-indigo-600">
                    +{result.scoreCalculationBreakdown.threatIntelBonus} pts
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Multi-Signal Multiplier:</span>
                  <span className="font-mono font-semibold text-[#0A2540]">
                    {result.scoreCalculationBreakdown.corroborationMultiplier}x
                  </span>
                </div>
                <div className="flex justify-between py-1.5 bg-slate-50 px-2 rounded font-bold text-[#0A2540]">
                  <span>Final Capped Risk Score:</span>
                  <span className="font-mono text-sm">
                    {result.scoreCalculationBreakdown.cappedFinalScore} / 100
                  </span>
                </div>
              </div>

              {/* Risk Score vs Heuristic Confidence Distinction */}
              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200/70 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-950">
                    Heuristic Confidence Score:
                  </span>
                  <span className="font-mono font-bold text-[#635BFF]">
                    {result.heuristicConfidence}%
                  </span>
                </div>
                <p className="text-[11px] text-indigo-900/80 leading-snug">
                  <strong>Risk Score ({result.riskScore}/100)</strong> measures fraud severity;{' '}
                  <strong>Confidence ({result.heuristicConfidence}%)</strong> measures structural signal completeness across {result.evaluatedRulesCount} rules.
                </p>
              </div>
            </div>
          </div>

          {/* Triggered Detection Rules & Factors Breakdown */}
          <div className="radar-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0A2540]">
                  Triggered Detection Factors ({result.triggeredFactors.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Exact rules triggered, point contribution, supporting evidence, and human-readable explanation
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {result.scoreCalculationBreakdown.formulaDescription}
              </span>
            </div>

            {result.triggeredFactors.length === 0 ? (
              <div className="p-6 text-center rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                <p className="font-semibold">
                  Zero Suspicious Heuristic Rules Triggered
                </p>
                <p className="text-emerald-700 mt-0.5">
                  The submitted {result.inputType} did not match any known scam patterns or synthetic threat intelligence indicators.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.triggeredFactors.map((factor) => (
                  <div
                    key={factor.ruleCode}
                    className="p-4 rounded-lg border border-slate-200/90 bg-slate-50/40 space-y-2.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[#0A2540] text-white">
                              {factor.ruleCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getRiskBadgeClasses(
                                factor.severity
                              )}`}
                            >
                              {factor.severity}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#0A2540] mt-1.5">
                            {factor.factorName}
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs font-bold shrink-0">
                          +{factor.scoreContribution} pts
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600">
                        {factor.description}
                      </p>

                      <div className="p-2 rounded bg-white border border-slate-200/80 text-[11px]">
                        <span className="font-semibold text-slate-700">
                          Supporting Evidence:{' '}
                        </span>
                        <span className="font-mono text-rose-700">
                          {factor.matchedEvidence}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                      <strong className="text-[#0A2540]">Why this matters: </strong>
                      {factor.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extracted Indicators, Recommended Verification, and Methodological Limitations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Extracted Indicators */}
            <div className="radar-card p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#0A2540]">
                Extracted Digital Indicators ({result.extractedIndicators.length})
              </h3>
              <div className="space-y-2">
                {result.extractedIndicators.map((ind, idx) => (
                  <div
                    key={`${ind.type}-${idx}`}
                    className="p-2.5 rounded border border-slate-200 bg-slate-50/60 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-50 text-indigo-700">
                        {ind.type}
                      </span>
                      {ind.matchedInDatabase ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800">
                          Matched DB ({ind.existingIndicatorId})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          New/Unindexed
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono font-semibold text-[#0A2540] break-all">
                      {ind.value}
                    </p>
                    <p className="text-[11px] text-slate-500">{ind.context}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Additional Verification */}
            <div className="radar-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#635BFF]" />
                <h3 className="text-sm font-bold text-[#0A2540]">
                  Appropriate Verification Steps
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                {result.recommendedActions.map((act, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 p-2.5 rounded bg-slate-50 border border-slate-200/70"
                  >
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Limitations & Responsible Use */}
            <div className="radar-card p-5 space-y-3 bg-amber-50/30 border-amber-200/80">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-bold text-[#0A2540]">
                  Assessment Limitations & Notice
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600">
                {result.limitations.map((lim, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 p-2.5 rounded bg-white border border-amber-200/70"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stored Analysis History Table */}
      <div className="radar-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <h3 className="text-sm font-bold text-[#0A2540]">
                Recent Explainable Analysis History
              </h3>
              <p className="text-[11px] text-slate-500">
                Persisted evaluations stored in the relational `AnalysisResult` table
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500">
            Showing latest {history.length} evaluations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4">Analysis ID</th>
                <th className="py-2.5 px-4">Channel</th>
                <th className="py-2.5 px-4">Submitted Indicator / Payload</th>
                <th className="py-2.5 px-4">Risk Score</th>
                <th className="py-2.5 px-4">Confidence</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-mono font-medium text-[#635BFF]">
                    {item.id}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-700">
                    {item.inputType}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600 max-w-md truncate">
                    {item.rawInput}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${getRiskBadgeClasses(
                        item.riskLevel
                      )}`}
                    >
                      {item.riskScore}/100 {item.riskLevel}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">
                    {item.heuristicConfidence}%
                  </td>
                  <td className="py-2.5 px-4 text-slate-500">
                    {formatDateTime(item.createdAt)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode(item.inputType as AnalysisInputType);
                        setRawInput(item.rawInput);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs font-semibold text-[#635BFF] hover:underline"
                    >
                      Re-Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

