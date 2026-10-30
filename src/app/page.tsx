import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ScanSearch,
  Briefcase,
  Radar,
  Lock,
  Network,
  BarChart3,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Terminal,
  Database,
  Scale,
  Cpu,
  ChevronRight,
} from 'lucide-react';
import { ScamTraceLogo } from '@/components/brand/scamtrace-logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-[#0A2540]">
      {/* Sticky Public Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <ScamTraceLogo size="md" showSubtitle />

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600">
            <a href="#introduction" className="hover:text-[#0A2540] transition-colors">
              Overview
            </a>
            <a href="#features" className="hover:text-[#0A2540] transition-colors">
              Capabilities
            </a>
            <a href="#workflow" className="hover:text-[#0A2540] transition-colors">
              How It Works
            </a>
            <a href="#technology" className="hover:text-[#0A2540] transition-colors">
              Architecture
            </a>
            <a href="#responsible-use" className="hover:text-[#0A2540] transition-colors">
              Responsible Use
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-2 text-xs font-semibold text-[#0A2540] hover:text-[#635BFF] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#635BFF] hover:bg-[#5249E8] text-white text-xs font-semibold shadow-sm transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-white via-[#F7F9FC] to-[#F1F5F9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-semibold text-[#635BFF]">
                <span className="w-2 h-2 rounded-full bg-[#635BFF]" />
                <span>Explainable Digital Scam Investigation Platform</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0A2540] leading-[1.12]">
                Investigate Smarter. Detect Scams.{' '}
                <span className="text-[#635BFF]">Understand Every Signal.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                An explainable digital scam investigation platform that transforms suspicious digital activity into actionable intelligence.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[#635BFF] hover:bg-[#5249E8] text-white text-sm font-semibold shadow-sm transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-white hover:bg-slate-50 text-[#0A2540] border border-slate-300 text-sm font-semibold shadow-2xs transition-all"
                >
                  <span>Explore Platform</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>

              {/* Key Trust Metrics Bar */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <p className="text-xl font-bold text-[#0A2540]">1,500+</p>
                  <p className="text-xs text-slate-500">
                    Interconnected Synthetic Records
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-[#635BFF]">24 Rules</p>
                  <p className="text-xs text-slate-500">
                    Weighted Explainable Heuristics
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-[#0A2540]">6 Channels</p>
                  <p className="text-xs text-slate-500">
                    URL, UPI, Email, Phone, Msg, Txn
                  </p>
                </div>
              </div>
            </div>

            {/* Right Interactive-Style Dashboard Preview */}
            <div className="lg:col-span-6">
              <div className="radar-card p-5 bg-white border-slate-200/90 shadow-xl ring-1 ring-slate-900/5 space-y-4">
                {/* Preview Window Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-xs font-mono font-medium text-slate-500">
                      scamtrace://analyze/explainable-engine-v2.4
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-rose-50 text-rose-700 border border-rose-200">
                    Critical Risk • 92 / 100
                  </span>
                </div>

                {/* Evaluated Indicator Box */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Submitted Indicator (Static Local Inspection)
                    </p>
                    <p className="text-xs font-mono font-semibold text-[#0A2540] truncate mt-0.5">
                      https://hdfc-kyc-update-0014.example/verify-kyc/login?ref=sms
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400">Confidence</p>
                    <p className="text-xs font-bold text-indigo-600">94% Heuristic</p>
                  </div>
                </div>

                {/* Triggered Rules Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0A2540]">
                      Explainable Factor Attribution
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Formula: min(100, (34 + 24 + 22) × 1.15)
                    </span>
                  </div>

                  {[
                    {
                      code: 'URL-TYPOSQUAT-BRAND',
                      title: 'Brand Typosquatting & Lookalike Domain',
                      evidence: 'Token "hdfc-kyc" on reserved .example domain',
                      weight: '+34 pts',
                      barWidth: 'w-4/5',
                      color: 'bg-rose-500',
                    },
                    {
                      code: 'URL-CREDENTIAL-PATH',
                      title: 'Credential Harvesting Path Signature',
                      evidence: 'URI endpoint "/verify-kyc/login" targets auth tokens',
                      weight: '+24 pts',
                      barWidth: 'w-3/5',
                      color: 'bg-amber-500',
                    },
                    {
                      code: 'INTEL-CORPUS-EXACT-MATCH',
                      title: 'Matched Synthetic Threat Intelligence Corpus',
                      evidence: 'Correlated with Case CASE-2026-0014 (11 reports)',
                      weight: '+34 pts',
                      barWidth: 'w-4/5',
                      color: 'bg-indigo-600',
                    },
                  ].map((factor) => (
                    <div
                      key={factor.code}
                      className="p-2.5 rounded-md border border-slate-200/80 bg-white space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 rounded">
                            {factor.code}
                          </span>
                          <span className="text-xs font-semibold text-[#0A2540]">
                            {factor.title}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-rose-600">
                          {factor.weight}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{factor.evidence}</p>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${factor.color} ${factor.barWidth}`} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Limitation Footnote */}
                <div className="p-2.5 rounded-md bg-indigo-50/60 border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-[#635BFF] shrink-0 mt-0.5" />
                  <span>
                    <strong>Explainable Verdict:</strong> Recommended out-of-band bank verification. Assessment is based on deterministic rule heuristics, not legal proof of criminal offense.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Introduction Section */}
      <section id="introduction" className="py-16 lg:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#635BFF]">
              Why ScamTrace Exists
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#0A2540]">
              Moving Beyond Black-Box &ldquo;Scam Detected&rdquo; Labels
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Modern digital fraud spans deceptive UPI collect requests, typosquatted KYC portals, Telegram prepaid task scams, customs parcel lures, and executive impersonation. Black-box classifiers leave analysts guessing why an alert fired. ScamTrace decomposes every assessment into transparent, auditable signals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'What ScamTrace Is',
                body: 'A full-stack, explainable digital scam detection and case investigation platform built with enterprise forensic workflows and a 1,500+ record interconnected intelligence corpus.',
              },
              {
                title: 'Why Investigation Matters',
                body: 'Single scam messages rarely exist in isolation. Connecting shared VoIP numbers, lookalike domains, and UPI handles uncovers coordinated fraud campaigns.',
              },
              {
                title: 'Problems It Solves',
                body: 'Eliminates opaque risk scoring by surfacing exact rule weights, matched lexical evidence, entity relationship graphs, and chain-of-custody artifact tracking.',
              },
              {
                title: 'Who Can Use It',
                body: 'Cybersecurity analysts, financial fraud investigators, trust & safety teams, academic researchers, and compliance auditors.',
              },
            ].map((card) => (
              <div key={card.title} className="radar-card p-5 space-y-2">
                <h3 className="text-sm font-bold text-[#0A2540]">{card.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8 Core Features Section */}
      <section id="features" className="py-16 lg:py-20 bg-[#F7F9FC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-[#635BFF]">
              Enterprise Capabilities
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#0A2540]">
              Everything Required for End-to-End Scam Forensics
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Inspired by Stripe Radar&apos;s precision telemetry, engineered specifically for digital scam investigation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: ScanSearch,
                title: 'Explainable Risk Scoring',
                desc: 'Transparent 0–100 scoring with exact rule weight contributions, corroboration multipliers, and confidence separation.',
              },
              {
                icon: ShieldCheck,
                title: 'Digital Scam Analysis',
                desc: 'Multi-modal static inspection across URLs, emails, phone numbers, SMS/WhatsApp messages, UPI handles, and UTRs.',
              },
              {
                icon: Briefcase,
                title: 'Investigation Management',
                desc: 'Full lifecycle case management with priority queues, investigator assignment, status transitions, and analyst notes.',
              },
              {
                icon: Radar,
                title: 'Threat Intelligence',
                desc: 'Track emerging scam archetypes, weekly growth trends, repeated indicators, and common social-engineering tactics.',
              },
              {
                icon: Lock,
                title: 'Evidence Management',
                desc: 'Centralized Evidence Vault with MIME validation, SHA-256 integrity hashing, and chain-of-custody timelines.',
              },
              {
                icon: Network,
                title: 'Entity Relationship Mapping',
                desc: 'Interactive React Flow graph visualizing connections between reports, phones, domains, UPI VPAs, and cases.',
              },
              {
                icon: BarChart3,
                title: 'Real-Time Risk Insights',
                desc: 'Interactive Recharts analytics covering daily detection velocity, category comparisons, and rule precision.',
              },
              {
                icon: FileText,
                title: 'Analytical Reports & Export',
                desc: 'One-click filtered CSV exports and printable forensic investigation case dossiers for stakeholder review.',
              },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="radar-card radar-card-hover p-5 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#635BFF]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-[#0A2540]">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works (Four-Step Workflow) */}
      <section id="workflow" className="py-16 lg:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#635BFF]">
              Investigative Workflow
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#0A2540]">
              How ScamTrace Works in Four Deterministic Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Submit Suspicious Information',
                desc: 'Supply a suspicious URL, phishing message, sender email, phone number, UPI VPA, or transaction reference into the sandboxed analyzer.',
              },
              {
                step: '02',
                title: 'Analyze Digital Indicators',
                desc: 'ScamTrace normalizes the input without visiting live untrusted hosts, extracts embedded entities, and cross-checks 1,500+ database records.',
              },
              {
                step: '03',
                title: 'Understand Risk Factors',
                desc: 'Inspect every triggered detection rule, its exact point contribution, matched lexical evidence, and recommended verification steps.',
              },
              {
                step: '04',
                title: 'Generate Investigation Report',
                desc: 'Link findings to an Investigation Case, attach SHA-256 verified evidence, visualize entity links, and export a formal report.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="radar-card p-5 relative overflow-hidden space-y-2.5"
              >
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-[#635BFF] border border-indigo-200/60">
                  STEP {item.step}
                </span>
                <h3 className="text-sm font-bold text-[#0A2540] pt-1">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section id="technology" className="py-16 lg:py-20 bg-[#F7F9FC] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#635BFF]">
                Engineering Architecture
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#0A2540]">
                Built on a Modern, Type-Safe Cybersecurity Stack
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Zero dependency on paid external APIs. Self-contained relational persistence, deterministic seeding, and server-side RBAC.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Layers,
                category: 'Frontend & Visualization',
                items: [
                  'Next.js 14 App Router & React 18',
                  'TypeScript Strict Mode',
                  'Tailwind CSS & Stripe Radar UI System',
                  'Recharts & React Flow (@xyflow/react)',
                ],
              },
              {
                icon: Terminal,
                category: 'Backend & Explainable Engine',
                items: [
                  'Next.js Route Handlers (REST API)',
                  '24-Rule Weighted Heuristic Engine',
                  'Zod Schema Input Validation',
                  'Endpoint Rate Limiting & Sanitization',
                ],
              },
              {
                icon: Database,
                category: 'Database & Persistence',
                items: [
                  'Prisma ORM & Normalized 15-Table Schema',
                  'PostgreSQL & Local SQLite Compatibility',
                  'Deterministic 1,500+ Record Seed Engine',
                  'Automated Dataset Verification CLI',
                ],
              },
              {
                icon: Cpu,
                category: 'Security & Quality Assurance',
                items: [
                  'bcryptjs Password Hashing',
                  'HTTP-Only Signed JWT Session Cookies',
                  '3-Tier RBAC (Admin, Investigator, Viewer)',
                  'Vitest Automated Test Suite & CI Workflow',
                ],
              },
            ].map((stack) => {
              const Icon = stack.icon;
              return (
                <div key={stack.category} className="radar-card p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-[#635BFF]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
                      {stack.category}
                    </h3>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {stack.items.map((li) => (
                      <li key={li} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Responsible Use Section */}
      <section id="responsible-use" className="py-14 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="radar-card p-6 sm:p-8 bg-slate-50/70 border-slate-200 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0A2540]">
                  Responsible Use & Methodological Transparency Statement
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-amber-100 text-amber-800">
                  Mandatory Notice
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ScamTrace is an <strong>investigative assistance and educational analysis platform</strong>, not a law enforcement authority, judicial body, or definitive fraud verification service. A high or critical risk score indicates that submitted inputs triggered structural, lexical, or synthetic corpus heuristics—it must never be treated as standalone proof of criminal activity.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-600">
                <div className="p-2.5 rounded bg-white border border-slate-200/80">
                  <strong className="text-[#0A2540] block">No Live URL Execution:</strong>
                  Submitted URLs are parsed locally as untrusted text to protect investigator endpoints.
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200/80">
                  <strong className="text-[#0A2540] block">100% Synthetic Dataset:</strong>
                  All 1,500+ seeded records use reserved `.example`/`.test` domains and fictional identifiers.
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200/80">
                  <strong className="text-[#0A2540] block">Human-in-the-Loop:</strong>
                  All automated risk scores require analyst corroboration and out-of-band verification.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A2540] text-slate-300 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#635BFF] flex items-center justify-center text-white font-bold text-xs">
                  ST
                </div>
                <span className="text-base font-bold text-white">
                  ScamTrace
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Explainable Digital Scam Investigation Platform. Engineered for transparent risk attribution, multi-entity graph correlation, and structured forensic case management.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-white uppercase tracking-wider">
                Platform
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <a href="#introduction" className="hover:text-white">
                    About ScamTrace
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white">
                    Features & Modules
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white">
                    Investigator Workspace
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-white uppercase tracking-wider">
                Resources
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <a href="#workflow" className="hover:text-white">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#responsible-use" className="hover:text-white">
                    Privacy & Synthetic Data Policy
                  </a>
                </li>
                <li>
                  <a href="#technology" className="hover:text-white">
                    System Architecture
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-white uppercase tracking-wider">
                Connect
              </p>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <Link href="/login" className="hover:text-white">
                    Demo Credentials Access
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white"
                  >
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a href="mailto:security@scamtrace.example" className="hover:text-white">
                    Contact Security Team
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>© 2026 ScamTrace Explainable Cybersecurity Platform. MIT License.</p>
            <div className="flex items-center gap-4">
              <Link href="/login" className="hover:text-white">
                Login
              </Link>
              <Link href="/signup" className="hover:text-white">
                Sign Up
              </Link>
              <a href="#responsible-use" className="hover:text-white">
                Responsible Use
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

