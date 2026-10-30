import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_DETECTION_RULES } from '../src/services/default-rules';

const prisma = new PrismaClient();

// Deterministic PRNG (Mulberry32) so seeding is 100% reproducible
function createDeterministicRng(seed = 20261030) {
  let a = seed;
  return function nextFloat(): number {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

const SCAM_CATEGORIES = [
  'PHISHING',
  'UPI_FRAUD',
  'FAKE_JOB',
  'INVESTMENT_SCAM',
  'DELIVERY_SCAM',
  'IMPERSONATION',
  'PAYMENT_REQUEST',
  'TECH_SUPPORT',
] as const;

const BRAND_STEMS = [
  'paypa1-secure',
  'stripe-verify-billing',
  'chase-account-check',
  'hdfc-kyc-update',
  'sbi-online-portal',
  'icici-security-alert',
  'amazon-parcel-hold',
  'dhl-customs-clearance',
  'fedex-redelivery-fee',
  'irs-tax-refund',
  'appleid-unlock-session',
  'microsoft-auth-verify',
  'binance-airdrop-claim',
  'usps-package-track',
  'indiapost-customs-duty',
  'netflix-payment-retry',
  'geek-squad-renewal',
  'quant-vip-signals',
  'remote-task-earner',
  'gov-subsidy-portal',
];

const SYNTHETIC_TLDS = ['.example', '.test', '.example.com', '.example.org', '.example.net'];

const URL_PATHS = [
  '/verify-kyc/login',
  '/account-unlock/session',
  '/claim-refund/upi-collect',
  '/customs-duty/pay-invoice',
  '/validate-otp/challenge',
  '/update-pan/compliance',
  '/wallet-connect/restore',
  '/security-check/confirm-pin',
  '/vip-task/register',
  '/redelivery/schedule-now',
];

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 ScamTrace Idempotent Synthetic Dataset Generator (Target: 1,500+ Records)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const rng = createDeterministicRng(20261030);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const intBetween = (min: number, max: number): number =>
    Math.floor(rng() * (max - min + 1)) + min;

  const baseNow = new Date('2026-10-30T06:00:00.000Z').getTime();
  const daysAgo = (days: number, hoursOffset = 0): Date =>
    new Date(baseNow - (days * 24 + hoursOffset) * 3600 * 1000);

  // Clean existing records in reverse dependency order for idempotent re-seeding
  console.log('🧹 Clearing existing records for idempotent seed...');
  await prisma.detectionFactor.deleteMany({});
  await prisma.analysisResult.deleteMany({});
  await prisma.entityRelationship.deleteMany({});
  await prisma.caseNote.deleteMany({});
  await prisma.evidence.deleteMany({});
  await prisma.scamReport.deleteMany({});
  await prisma.messageSample.deleteMany({});
  await prisma.transactionEvent.deleteMany({});
  await prisma.indicator.deleteMany({});
  await prisma.investigationCase.deleteMany({});
  await prisma.threatPattern.deleteMany({});
  await prisma.detectionRule.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Users (6 accounts including the 3 role demo accounts)
  console.log('👤 Seeding Users & Role-Based Demo Accounts...');
  const adminPasswordHash = await bcrypt.hash('ScamTrace@Admin2026', 10);
  const investigatorPasswordHash = await bcrypt.hash('ScamTrace@Investigator2026', 10);
  const viewerPasswordHash = await bcrypt.hash('ScamTrace@Viewer2026', 10);

  const users = [
    {
      id: 'USR-ADMIN-01',
      email: 'admin@scamtrace.example',
      fullName: 'Dr. Elena Vance',
      passwordHash: adminPasswordHash,
      role: 'ADMINISTRATOR',
      department: 'Cyber Threat Intelligence & Governance',
      avatarColor: '#4F46E5',
      isActive: true,
      notifyHighRisk: true,
      notifyCaseAssign: true,
      notifyEvidence: true,
      notifyRules: true,
      lastLoginAt: daysAgo(0, 1),
      createdAt: daysAgo(90),
      updatedAt: daysAgo(0, 1),
    },
    {
      id: 'USR-INV-01',
      email: 'investigator@scamtrace.example',
      fullName: 'Marcus Chen',
      passwordHash: investigatorPasswordHash,
      role: 'INVESTIGATOR',
      department: 'Financial Fraud & UPI Forensics',
      avatarColor: '#0284C7',
      isActive: true,
      notifyHighRisk: true,
      notifyCaseAssign: true,
      notifyEvidence: true,
      notifyRules: false,
      lastLoginAt: daysAgo(0, 2),
      createdAt: daysAgo(85),
      updatedAt: daysAgo(0, 2),
    },
    {
      id: 'USR-VIEW-01',
      email: 'viewer@scamtrace.example',
      fullName: 'Priya Nair',
      passwordHash: viewerPasswordHash,
      role: 'VIEWER',
      department: 'Academic Research & Compliance Audit',
      avatarColor: '#059669',
      isActive: true,
      notifyHighRisk: false,
      notifyCaseAssign: false,
      notifyEvidence: false,
      notifyRules: false,
      lastLoginAt: daysAgo(1, 4),
      createdAt: daysAgo(75),
      updatedAt: daysAgo(1, 4),
    },
    {
      id: 'USR-INV-02',
      email: 'arjun.mehta@scamtrace.example',
      fullName: 'Arjun Mehta',
      passwordHash: investigatorPasswordHash,
      role: 'INVESTIGATOR',
      department: 'Phishing & Domain Infrastructure',
      avatarColor: '#7C3AED',
      isActive: true,
      notifyHighRisk: true,
      notifyCaseAssign: true,
      notifyEvidence: true,
      notifyRules: false,
      lastLoginAt: daysAgo(0, 5),
      createdAt: daysAgo(70),
      updatedAt: daysAgo(0, 5),
    },
    {
      id: 'USR-INV-03',
      email: 'sarah.jenkins@scamtrace.example',
      fullName: 'Sarah Jenkins',
      passwordHash: investigatorPasswordHash,
      role: 'INVESTIGATOR',
      department: 'Social Engineering & Recruitment Scams',
      avatarColor: '#D97706',
      isActive: true,
      notifyHighRisk: true,
      notifyCaseAssign: true,
      notifyEvidence: true,
      notifyRules: false,
      lastLoginAt: daysAgo(2, 3),
      createdAt: daysAgo(60),
      updatedAt: daysAgo(2, 3),
    },
    {
      id: 'USR-INV-04',
      email: 'david.okafor@scamtrace.example',
      fullName: 'David Okafor',
      passwordHash: investigatorPasswordHash,
      role: 'INVESTIGATOR',
      department: 'Cross-Border Payment Mule Tracking',
      avatarColor: '#E11D48',
      isActive: true,
      notifyHighRisk: true,
      notifyCaseAssign: true,
      notifyEvidence: true,
      notifyRules: false,
      lastLoginAt: daysAgo(1, 8),
      createdAt: daysAgo(55),
      updatedAt: daysAgo(1, 8),
    },
  ];

  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  const investigatorIds = ['USR-ADMIN-01', 'USR-INV-01', 'USR-INV-02', 'USR-INV-03', 'USR-INV-04'];

  // 2. Seed Detection Rules (24 rules)
  console.log('⚙️ Seeding 24 Explainable Detection Rules...');
  for (let i = 0; i < DEFAULT_DETECTION_RULES.length; i++) {
    const r = DEFAULT_DETECTION_RULES[i];
    await prisma.detectionRule.create({
      data: {
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        category: r.category,
        targetTypes: r.targetTypes,
        severity: r.severity,
        scoreWeight: r.scoreWeight,
        maxWeight: r.maxWeight,
        isActive: r.isActive,
        matchCount: r.matchCount,
        precisionEstimate: r.precisionEstimate,
        patternConfigJson: r.patternConfigJson,
        explanationTemplate: r.explanationTemplate,
        lastTriggeredAt: daysAgo(i % 7, i),
        createdAt: daysAgo(90),
        updatedAt: daysAgo(i % 10),
      },
    });
  }

  // 3. Seed Threat Intelligence Patterns (16 patterns)
  console.log('🛰️ Seeding 16 Threat Intelligence Patterns...');
  const threatPatterns = [
    {
      id: 'TP-001',
      code: 'PAT-UPI-COLLECT-TRAP',
      name: 'Deceptive UPI Collect-Request Refund Lure',
      category: 'UPI_FRAUD',
      severity: 'CRITICAL',
      description: 'Attackers impersonate marketplace buyers or bank refund desks and send a UPI Collect Request or QR code claiming the user must enter their MPIN to receive funds.',
      commonTacticsJson: JSON.stringify(['Reverse collect request', 'Deceptive VPA handle (refund@/cashback@)', 'Phone call pressure during PIN entry']),
      targetPersona: 'Online Marketplace Sellers & Retail Consumers',
      detectionCount: 284,
      weeklyGrowthPct: 18.4,
      confidenceLimitation: 'Synthetic pattern derived from modeled UPI pull-request telemetry; does not query NPCI live switches.',
      isEmerging: true,
    },
    {
      id: 'TP-002',
      code: 'PAT-KYC-EXPIRY-SMS',
      name: 'Urgent Banking KYC Suspension & PAN Update Phishing',
      category: 'PHISHING',
      severity: 'CRITICAL',
      description: 'Bulk SMS and WhatsApp campaigns warning that bank accounts or cards will be frozen within 24 hours unless KYC is updated via a typosquatted `.example` link.',
      commonTacticsJson: JSON.stringify(['Typosquatted banking domains', '24-hour suspension countdown', 'OTP & NetBanking credential harvesting']),
      targetPersona: 'Retail Banking Customers',
      detectionCount: 342,
      weeklyGrowthPct: 12.1,
      confidenceLimitation: 'Evaluated via static URL lexical tokens and message coercion heuristics.',
      isEmerging: false,
    },
    {
      id: 'TP-003',
      code: 'PAT-TASK-PREPAID-JOB',
      name: 'Telegram/WhatsApp Prepaid VIP Task Recruitment Scam',
      category: 'FAKE_JOB',
      severity: 'HIGH',
      description: 'Victims are recruited for remote rating tasks (Google Maps / YouTube likes), paid small initial rewards, and then coerced into depositing escalating sums for "VIP bundled tasks".',
      commonTacticsJson: JSON.stringify(['Initial micro-payout trust building', 'Prepaid merchant task lock-in', 'Fake recruiter WhatsApp numbers']),
      targetPersona: 'Students, Job Seekers & Freelancers',
      detectionCount: 219,
      weeklyGrowthPct: 24.7,
      confidenceLimitation: 'Synthetic linguistic & payment corridor correlation.',
      isEmerging: true,
    },
    {
      id: 'TP-004',
      code: 'PAT-PARCEL-CUSTOMS-FEE',
      name: 'Undeliverable Parcel & Nominal Redelivery Fee Harvesting',
      category: 'DELIVERY_SCAM',
      severity: 'HIGH',
      description: 'SMS notifications claiming a package is detained at a sorting warehouse due to an unreadable address, directing users to a clone logistics portal to pay a $1.99 fee.',
      commonTacticsJson: JSON.stringify(['Logistics brand impersonation', 'Nominal fee card skimmer form', 'SMS OTP interception for high-value charge']),
      targetPersona: 'E-Commerce Shoppers',
      detectionCount: 198,
      weeklyGrowthPct: 9.5,
      confidenceLimitation: 'Rule-based domain and SMS template matching.',
      isEmerging: false,
    },
    {
      id: 'TP-005',
      code: 'PAT-QUANT-CRYPTO-PIGBUTCHER',
      name: 'Institutional Quant Trading & Guaranteed Crypto ROI Scheme',
      category: 'INVESTMENT_SCAM',
      severity: 'CRITICAL',
      description: 'Long-con investment groups operating on messaging apps that direct victims to fabricated trading dashboards displaying manipulated 200%+ gains before blocking withdrawals.',
      commonTacticsJson: JSON.stringify(['Guaranteed daily ROI claims', 'Fake "tax clearance" withdrawal fee', 'Synthetic trading portal domains']),
      targetPersona: 'Retail Investors & Retirees',
      detectionCount: 176,
      weeklyGrowthPct: 21.3,
      confidenceLimitation: 'Synthetic investment scam indicator cluster.',
      isEmerging: true,
    },
    {
      id: 'TP-006',
      code: 'PAT-DIGITAL-ARREST-EXTORTION',
      name: 'Law Enforcement / Customs "Digital Arrest" Video Extortion',
      category: 'IMPERSONATION',
      severity: 'CRITICAL',
      description: 'Impersonators posing as customs or cybercrime officers allege a parcel containing contraband was seized in the victim\'s name and demand a "security bond" transfer.',
      commonTacticsJson: JSON.stringify(['Authority intimidation', 'Continuous video/call isolation', 'Immediate wire/RTGS transfer to verification account']),
      targetPersona: 'Senior Citizens & Salaried Professionals',
      detectionCount: 154,
      weeklyGrowthPct: 31.2,
      confidenceLimitation: 'Heuristic detection of authority coercion & bond transfer terms.',
      isEmerging: true,
    },
    {
      id: 'TP-007',
      code: 'PAT-CEO-BEC-WIRE',
      name: 'Executive Business Email Compromise (BEC) Urgent Wire',
      category: 'PAYMENT_REQUEST',
      severity: 'HIGH',
      description: 'Spoofed executive or vendor emails requesting confidential invoice bank account updates or urgent gift card purchases while claiming the sender is in a board meeting.',
      commonTacticsJson: JSON.stringify(['Lookalike corporate domains', 'Confidentiality demand', 'Modified beneficiary IBAN/ACH details']),
      targetPersona: 'Corporate Finance & AP Teams',
      detectionCount: 132,
      weeklyGrowthPct: 6.8,
      confidenceLimitation: 'Static email header and domain lookalike analysis.',
      isEmerging: false,
    },
    {
      id: 'TP-008',
      code: 'PAT-TECH-SUPPORT-INVOICE',
      name: 'Fake Antivirus Auto-Renewal Invoice & Remote Access Trap',
      category: 'TECH_SUPPORT',
      severity: 'HIGH',
      description: 'Emails containing fabricated $399–$499 security software renewal receipts that urge the victim to call a toll-free number and install AnyDesk/TeamViewer for a "refund".',
      commonTacticsJson: JSON.stringify(['Fabricated renewal invoice PDF/text', 'Callback VoIP helpline', 'Remote desktop tool installation']),
      targetPersona: 'Desktop & Home Internet Users',
      detectionCount: 118,
      weeklyGrowthPct: -2.4,
      confidenceLimitation: 'Synthetic callback number and remote-tool keyword matching.',
      isEmerging: false,
    },
    {
      id: 'TP-009',
      code: 'PAT-UTILITY-DISCONNECT-TONIGHT',
      name: 'Electricity / Utility Bill Immediate Disconnection Threat',
      category: 'PHISHING',
      severity: 'HIGH',
      description: 'Evening SMS alerts warning that residential power will be disconnected at 9:30 PM due to an unupdated previous bill payment, instructing victims to contact a personal number.',
      commonTacticsJson: JSON.stringify(['After-hours panic timing', 'Personal mobile helpline number', 'Malicious APK or phishing payment link']),
      targetPersona: 'Household Utility Consumers',
      detectionCount: 145,
      weeklyGrowthPct: 14.0,
      confidenceLimitation: 'Synthetic utility threat corpus.',
      isEmerging: false,
    },
    {
      id: 'TP-010',
      code: 'PAT-PUNYCODE-WALLET-DRAIN',
      name: 'IDN Homograph (Punycode) Web3 Airdrop & Wallet Connect Phishing',
      category: 'PHISHING',
      severity: 'CRITICAL',
      description: 'Internationalized domain names (`xn--`) visually identical to popular exchanges that prompt users to input recovery seed phrases or sign malicious token approvals.',
      commonTacticsJson: JSON.stringify(['Punycode xn-- homographs', 'Expiring airdrop claim timer', 'Seed phrase solicitation']),
      targetPersona: 'Digital Asset Holders',
      detectionCount: 109,
      weeklyGrowthPct: 19.6,
      confidenceLimitation: 'Lexical punycode and path analysis.',
      isEmerging: true,
    },
    {
      id: 'TP-011',
      code: 'PAT-QR-MERCHANT-SWAP',
      name: 'Fake Marketplace Buyer QR Code Payment Trap',
      category: 'UPI_FRAUD',
      severity: 'HIGH',
      description: 'Fraudulent buyers contact classifieds sellers, claim they can only pay via a "business QR settlement code", and send a debit QR image.',
      commonTacticsJson: JSON.stringify(['Classifieds seller targeting', 'QR code scan-to-receive lie', 'Repeated debit attempts']),
      targetPersona: 'Peer-to-Peer Classifieds Sellers',
      detectionCount: 127,
      weeklyGrowthPct: 11.2,
      confidenceLimitation: 'Synthetic UPI handle & script pattern.',
      isEmerging: false,
    },
    {
      id: 'TP-012',
      code: 'PAT-TAX-REFUND-PORTAL',
      name: 'Spoofed Tax Authority Rebate & Direct Deposit Portal',
      category: 'IMPERSONATION',
      severity: 'HIGH',
      description: 'Seasonal phishing messages promising an approved tax rebate pending bank account re-verification on a lookalike government portal.',
      commonTacticsJson: JSON.stringify(['Government agency spoofing', 'Rebate amount lure', 'Full banking credential capture']),
      targetPersona: 'Taxpayers',
      detectionCount: 94,
      weeklyGrowthPct: 8.3,
      confidenceLimitation: 'Synthetic tax-lure indicator set.',
      isEmerging: false,
    },
    {
      id: 'TP-013',
      code: 'PAT-VISA-INTERVIEW-FEE',
      name: 'Overseas Employment Visa & Biometric Slot Advance Fee',
      category: 'FAKE_JOB',
      severity: 'MEDIUM',
      description: 'Fake overseas recruitment agencies issuing forged offer letters and demanding upfront wire or UPI transfers for expedited visa processing.',
      commonTacticsJson: JSON.stringify(['Forged appointment letter', 'Urgent embassy slot fee', 'Mule bank account settlement']),
      targetPersona: 'International Job Applicants',
      detectionCount: 83,
      weeklyGrowthPct: 7.5,
      confidenceLimitation: 'Synthetic recruitment advance-fee dataset.',
      isEmerging: false,
    },
    {
      id: 'TP-014',
      code: 'PAT-ESCROW-VEHICLE-LISTING',
      name: 'Phantom Vehicle / Electronics Escrow Deposit Fraud',
      category: 'PAYMENT_REQUEST',
      severity: 'MEDIUM',
      description: 'Deeply discounted listings claiming the seller is relocating urgently and requesting a refundable transport escrow deposit before viewing.',
      commonTacticsJson: JSON.stringify(['Below-market price lure', 'Fake escrow transaction reference', 'Immediate deposit pressure']),
      targetPersona: 'Online Second-Hand Buyers',
      detectionCount: 79,
      weeklyGrowthPct: 5.1,
      confidenceLimitation: 'Synthetic transaction memo correlation.',
      isEmerging: false,
    },
    {
      id: 'TP-015',
      code: 'PAT-SIM-SWAP-PRETEXT',
      name: 'Telecom 5G Upgrade & eSIM Activation OTP Pretexting',
      category: 'PHISHING',
      severity: 'CRITICAL',
      description: 'Attackers pose as telecom support offering a free 5G upgrade and trick the target into forwarding an SMS or OTP that initiates an unauthorized eSIM swap.',
      commonTacticsJson: JSON.stringify(['Telecom carrier impersonation', 'eSIM transfer SMS forwarding', 'Subsequent banking account takeover']),
      targetPersona: 'Mobile Subscribers',
      detectionCount: 91,
      weeklyGrowthPct: 16.9,
      confidenceLimitation: 'Synthetic telecom pretexting dataset.',
      isEmerging: true,
    },
    {
      id: 'TP-016',
      code: 'PAT-CHARITY-RELIEF-SPOOF',
      name: 'Synthetic Emergency Relief & Grant Claim Portal',
      category: 'UPI_FRAUD',
      severity: 'MEDIUM',
      description: 'Lookalike relief fund portals and UPI handles soliciting donations or promising instant government subsidy grants upon registration.',
      commonTacticsJson: JSON.stringify(['Deceptive relief VPA handles', 'Fake subsidy eligibility form', 'Social media share chains']),
      targetPersona: 'General Public',
      detectionCount: 68,
      weeklyGrowthPct: 4.2,
      confidenceLimitation: 'Synthetic campaign cluster.',
      isEmerging: false,
    },
  ];

  for (let i = 0; i < threatPatterns.length; i++) {
    const tp = threatPatterns[i];
    await prisma.threatPattern.create({
      data: {
        ...tp,
        sourceLabel: 'Synthetic Intelligence Corpus v2.4',
        firstObservedAt: daysAgo(60 + i * 2),
        lastObservedAt: daysAgo(i % 5),
      },
    });
  }

  // 4. Seed 110 Investigation Cases
  console.log('📁 Seeding 110 Investigation Cases...');
  const caseStatuses = [
    'NEW',
    'UNDER_INVESTIGATION',
    'PENDING_REVIEW',
    'RESOLVED',
    'CLOSED',
  ] as const;
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

  const caseTitlesByCategory: Record<string, string[]> = {
    PHISHING: [
      'Coordinated Banking KYC Suspension Phishing Infrastructure',
      'Multi-Domain Credential Harvesting Kit Targeting Retail Depositors',
      'Punycode Homograph Authentication Portal Cluster',
      'Telecom eSIM Upgrade Pretexting & OTP Capture Campaign',
    ],
    UPI_FRAUD: [
      'Deceptive UPI Collect-Request Refund Handle Network',
      'Classifieds Seller QR-Code Reverse Debit Ring',
      'Fake Cashback & Subsidy VPA Mule Cluster',
      'High-Velocity UPI Pull Request Impersonation Operation',
    ],
    FAKE_JOB: [
      'Telegram Prepaid VIP Task & Hotel Rating Fraud Ring',
      'Advance-Fee Remote Data Entry & Recruitment Deposit Scheme',
      'Forged Overseas Employment Visa Processing Fee Network',
      'YouTube/Maps Micro-Commission Task Lock-In Campaign',
    ],
    INVESTMENT_SCAM: [
      'Unlicensed Institutional Quant Signal & Crypto Multiplier Group',
      'Fabricated Forex Trading Portal & Withdrawal Tax Extortion',
      'Guaranteed 200% Return Social Messaging Investment Ring',
      'Synthetic Gold & Algo-Trading Escrow Fraud Investigation',
    ],
    DELIVERY_SCAM: [
      'Cloned Logistics Customs Duty & Redelivery Fee Skimmer',
      'Detained Warehouse Parcel SMS Lure Infrastructure',
      'Fake Postal Address Verification Card Harvesting Cluster',
      'Cross-Border Shipment Hold Notification Phishing Wave',
    ],
    IMPERSONATION: [
      'Spoofed Cybercrime & Customs "Digital Arrest" Extortion Cell',
      'Lookalike Tax Authority Rebate Verification Portal',
      'Executive C-Suite Impersonation & Urgent Gift Card Campaign',
      'Regulatory Compliance Notice Spoofing Operation',
    ],
    PAYMENT_REQUEST: [
      'Business Email Compromise Vendor IBAN Modification Case',
      'Phantom Vehicle & Electronics Transport Escrow Fraud',
      'Fraudulent Invoice Settlement & Split Mule Dispersion',
      'Unauthorized Urgent Wire Transfer Redirection Cluster',
    ],
    TECH_SUPPORT: [
      'Fake Security Subscription Auto-Renewal & AnyDesk Callback Ring',
      'Browser Security Lock Alert & Toll-Free Vishing Operation',
      'Fabricated Firewall Invoice Refund Social Engineering Case',
      'Remote Desktop Credential Theft via Fake Helpdesk',
    ],
  };

  const casesData: Array<{
    id: string;
    caseNumber: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    riskLevel: string;
    riskScore: number;
    status: string;
    assignedToId: string;
    resolutionSummary: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (let i = 1; i <= 110; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `CASE-2026-${numStr}`;
    const category = SCAM_CATEGORIES[(i - 1) % SCAM_CATEGORIES.length];
    const titleTemplates = caseTitlesByCategory[category];
    const baseTitle = titleTemplates[(i - 1) % titleTemplates.length];
    const riskScore = intBetween(35, 98);
    const riskLevel = getRiskLevel(riskScore);
    const priority =
      riskScore >= 80
        ? 'CRITICAL'
        : riskScore >= 60
        ? 'HIGH'
        : riskScore >= 40
        ? 'MEDIUM'
        : pick(priorities);
    const status = caseStatuses[(i - 1) % caseStatuses.length];
    const assignedToId = investigatorIds[(i - 1) % investigatorIds.length];
    const createdDaysAgo = intBetween(2, 65);
    const updatedDaysAgo = Math.max(0, createdDaysAgo - intBetween(1, 10));

    casesData.push({
      id,
      caseNumber: id,
      title: `${baseTitle} (#${numStr})`,
      description: `Structured investigation into ${category.toLowerCase().replace('_', ' ')} cluster #${numStr}. Correlates submitted victim reports, synthetic indicator telemetry, and payment settlement artifacts across shared infrastructure.`,
      category,
      priority,
      riskLevel,
      riskScore,
      status,
      assignedToId,
      resolutionSummary:
        status === 'RESOLVED' || status === 'CLOSED'
          ? `Confirmed synthetic scam pattern; indicators cataloged, rules calibrated, and forensic summary exported for academic review.`
          : null,
      createdAt: daysAgo(createdDaysAgo, i % 12),
      updatedAt: daysAgo(updatedDaysAgo, i % 6),
    });
  }

  await prisma.investigationCase.createMany({ data: casesData });

  // 5. Seed Indicators (820 total: 320 URL/Domain + 210 Phone + 210 Email + 80 UPI/Txn/Msg)
  console.log('🔍 Seeding 820 Suspicious Indicators (320 URL/Domain, 210 Phone, 210 Email, 80 UPI/Txn)...');
  const indicatorsData: Array<{
    id: string;
    value: string;
    normalizedValue: string;
    type: string;
    category: string;
    riskScore: number;
    riskLevel: string;
    confidenceScore: number;
    status: string;
    summaryReason: string;
    technicalAttributesJson: string;
    sourceClassification: string;
    associationCount: number;
    firstSeenAt: Date;
    lastSeenAt: Date;
    caseId: string;
    threatPatternId: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  const indicatorStatuses = ['ACTIVE', 'ACTIVE', 'MONITORING', 'MITIGATED'] as const;

  // 5a. 180 URL Indicators + 140 Domain Indicators = 320 URL/Domain Indicators (>= 300 required)
  for (let i = 1; i <= 180; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `IND-URL-${numStr}`;
    const stem = BRAND_STEMS[(i - 1) % BRAND_STEMS.length];
    const tld = SYNTHETIC_TLDS[(i - 1) % SYNTHETIC_TLDS.length];
    const path = URL_PATHS[(i - 1) % URL_PATHS.length];
    const proto = i % 5 === 0 ? 'http' : 'https';
    const urlValue = `${proto}://${stem}-${numStr}${tld}${path}?ref=cmp_${i}`;
    const category = SCAM_CATEGORIES[(i - 1) % SCAM_CATEGORIES.length];
    const score = intBetween(48, 97);
    const level = getRiskLevel(score);
    const linkedCase = casesData[(i - 1) % casesData.length];
    const linkedPattern = threatPatterns[(i - 1) % threatPatterns.length];
    const seenDays = intBetween(1, 55);

    indicatorsData.push({
      id,
      value: urlValue,
      normalizedValue: urlValue.toLowerCase(),
      type: 'URL',
      category,
      riskScore: score,
      riskLevel: level,
      confidenceScore: intBetween(78, 98),
      status: pick(indicatorStatuses),
      summaryReason: `Typosquatted brand stem "${stem}" paired with credential harvesting path "${path}" on reserved synthetic domain.`,
      technicalAttributesJson: JSON.stringify({
        protocol: proto,
        hostname: `${stem}-${numStr}${tld}`,
        path,
        triggeredRules: ['URL-TYPOSQUAT-BRAND', 'URL-CREDENTIAL-PATH'],
        staticInspectionOnly: true,
      }),
      sourceClassification: i % 3 === 0 ? 'ANALYST_SUBMISSION' : 'SYNTHETIC_SEED',
      associationCount: intBetween(2, 18),
      firstSeenAt: daysAgo(seenDays + 5),
      lastSeenAt: daysAgo(Math.max(0, seenDays - 2)),
      caseId: linkedCase.id,
      threatPatternId: linkedPattern.id,
      createdAt: daysAgo(seenDays + 5),
      updatedAt: daysAgo(Math.max(0, seenDays - 2)),
    });
  }

  for (let i = 1; i <= 140; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `IND-DOM-${numStr}`;
    const stem = BRAND_STEMS[(i + 4) % BRAND_STEMS.length];
    const tld = SYNTHETIC_TLDS[(i + 1) % SYNTHETIC_TLDS.length];
    const domainValue =
      i % 9 === 0
        ? `xn--${stem}-${numStr}${tld}`
        : `portal-${stem}-${numStr}${tld}`;
    const category = SCAM_CATEGORIES[(i + 2) % SCAM_CATEGORIES.length];
    const score = intBetween(42, 95);
    const level = getRiskLevel(score);
    const linkedCase = casesData[(i + 10) % casesData.length];
    const linkedPattern = threatPatterns[(i + 2) % threatPatterns.length];
    const seenDays = intBetween(1, 50);

    indicatorsData.push({
      id,
      value: domainValue,
      normalizedValue: domainValue.toLowerCase(),
      type: 'DOMAIN',
      category,
      riskScore: score,
      riskLevel: level,
      confidenceScore: intBetween(75, 96),
      status: pick(indicatorStatuses),
      summaryReason: `Deceptive lookalike domain registration pattern mimicking trusted institutional infrastructure.`,
      technicalAttributesJson: JSON.stringify({
        registrableDomain: domainValue,
        isPunycode: domainValue.startsWith('xn--'),
        subdomainDepth: 2,
        triggeredRules: ['URL-TYPOSQUAT-BRAND', 'INTEL-CAMPAIGN-INFRASTRUCTURE'],
      }),
      sourceClassification: 'SYNTHETIC_SEED',
      associationCount: intBetween(2, 15),
      firstSeenAt: daysAgo(seenDays + 6),
      lastSeenAt: daysAgo(Math.max(0, seenDays - 1)),
      caseId: linkedCase.id,
      threatPatternId: linkedPattern.id,
      createdAt: daysAgo(seenDays + 6),
      updatedAt: daysAgo(Math.max(0, seenDays - 1)),
    });
  }

  // 5b. 210 Suspicious Phone Indicators (>= 200 required)
  const phonePrefixes = [
    '+1-555-01',
    '+44-7700-90',
    '+91-99990-0',
    '+1-800-555-',
    '+61-491-57',
    '+234-800-00',
  ];
  for (let i = 1; i <= 210; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `IND-PHN-${numStr}`;
    const prefix = phonePrefixes[(i - 1) % phonePrefixes.length];
    const phoneValue = `${prefix}${numStr}`;
    const normalizedPhone = phoneValue.replace(/[^\d+]/g, '');
    const category = SCAM_CATEGORIES[(i + 1) % SCAM_CATEGORIES.length];
    const score = intBetween(32, 94);
    const level = getRiskLevel(score);
    const linkedCase = casesData[(i - 1) % casesData.length];
    const linkedPattern = threatPatterns[(i + 3) % threatPatterns.length];
    const seenDays = intBetween(1, 45);

    indicatorsData.push({
      id,
      value: phoneValue,
      normalizedValue: normalizedPhone,
      type: 'PHONE',
      category,
      riskScore: score,
      riskLevel: level,
      confidenceScore: intBetween(74, 95),
      status: pick(indicatorStatuses),
      summaryReason: `Synthetic virtual VoIP / callback number linked to mass SMS lures and impersonation voice calls.`,
      technicalAttributesJson: JSON.stringify({
        AllocationBlock: prefix,
        carrierType: 'Synthetic Virtual VoIP Gateway',
        triggeredRules: ['PHONE-VIRTUAL-VOIP-PREFIX', 'PHONE-REPEATED-REPORT-CLUSTER'],
      }),
      sourceClassification: i % 4 === 0 ? 'ANALYST_SUBMISSION' : 'SYNTHETIC_SEED',
      associationCount: intBetween(1, 14),
      firstSeenAt: daysAgo(seenDays + 4),
      lastSeenAt: daysAgo(Math.max(0, seenDays - 1)),
      caseId: linkedCase.id,
      threatPatternId: linkedPattern.id,
      createdAt: daysAgo(seenDays + 4),
      updatedAt: daysAgo(Math.max(0, seenDays - 1)),
    });
  }

  // 5c. 210 Suspicious Email Indicators (>= 200 required)
  const emailRolePrefixes = [
    'security-alert',
    'kyc-compliance',
    'refund-desk',
    'customs-clearance',
    'vip-recruiter',
    'ceo-urgent-wire',
    'billing-renewal',
    'tax-rebate-office',
    'wallet-verify',
    'parcel-hold-notice',
  ];
  for (let i = 1; i <= 210; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `IND-EML-${numStr}`;
    const rolePrefix = emailRolePrefixes[(i - 1) % emailRolePrefixes.length];
    const stem = BRAND_STEMS[(i - 1) % BRAND_STEMS.length];
    const tld = i % 2 === 0 ? '.example' : '.test';
    const emailValue = `${rolePrefix}.${numStr}@${stem}${tld}`;
    const category = SCAM_CATEGORIES[(i + 3) % SCAM_CATEGORIES.length];
    const score = intBetween(38, 96);
    const level = getRiskLevel(score);
    const linkedCase = casesData[(i + 5) % casesData.length];
    const linkedPattern = threatPatterns[(i + 5) % threatPatterns.length];
    const seenDays = intBetween(1, 50);

    indicatorsData.push({
      id,
      value: emailValue,
      normalizedValue: emailValue.toLowerCase(),
      type: 'EMAIL',
      category,
      riskScore: score,
      riskLevel: level,
      confidenceScore: intBetween(76, 97),
      status: pick(indicatorStatuses),
      summaryReason: `Authoritative role prefix "${rolePrefix}" paired with lookalike synthetic domain "${stem}${tld}".`,
      technicalAttributesJson: JSON.stringify({
        localPart: `${rolePrefix}.${numStr}`,
        domain: `${stem}${tld}`,
        spfAlignment: 'fail (synthetic)',
        triggeredRules: ['EMAIL-DISPLAY-DOMAIN-SPOOF', 'EMAIL-HIGH-ENTROPY-LOCALPART'],
      }),
      sourceClassification: 'SYNTHETIC_SEED',
      associationCount: intBetween(1, 12),
      firstSeenAt: daysAgo(seenDays + 5),
      lastSeenAt: daysAgo(Math.max(0, seenDays - 1)),
      caseId: linkedCase.id,
      threatPatternId: linkedPattern.id,
      createdAt: daysAgo(seenDays + 5),
      updatedAt: daysAgo(Math.max(0, seenDays - 1)),
    });
  }

  // 5d. 80 Additional UPI & Transaction Indicators
  const upiHandles = [
    'refund.claim',
    'kycdesk.verify',
    'cashback.reward',
    'customercare.unblock',
    'pmcare.grant',
    'taxrefund.instant',
    'merchant.escrow',
    'viptask.deposit',
  ];
  const upiPsps = ['@sandboxupi', '@tempbank', '@fastpaytest', '@anonwallet', '@fakepsp'];
  for (let i = 1; i <= 80; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `IND-UPI-${numStr}`;
    const handle = upiHandles[(i - 1) % upiHandles.length];
    const psp = upiPsps[(i - 1) % upiPsps.length];
    const upiValue = `${handle}${numStr}${psp}`;
    const score = intBetween(62, 98);
    const level = getRiskLevel(score);
    const linkedCase = casesData[(i - 1) % casesData.length];
    const seenDays = intBetween(1, 40);

    indicatorsData.push({
      id,
      value: upiValue,
      normalizedValue: upiValue.toLowerCase(),
      type: 'UPI',
      category: 'UPI_FRAUD',
      riskScore: score,
      riskLevel: level,
      confidenceScore: intBetween(84, 98),
      status: 'ACTIVE',
      summaryReason: `Deceptive UPI Virtual Payment Address using "${handle}" prefix to disguise outgoing collect-request debits as incoming refunds.`,
      technicalAttributesJson: JSON.stringify({
        vpaPrefix: `${handle}${numStr}`,
        pspSuffix: psp,
        collectRequestAbuse: true,
        triggeredRules: ['UPI-DECEPTIVE-COLLECT-HANDLE', 'UPI-UNRECOGNIZED-PSP-FORMAT'],
      }),
      sourceClassification: 'SYNTHETIC_SEED',
      associationCount: intBetween(3, 19),
      firstSeenAt: daysAgo(seenDays + 3),
      lastSeenAt: daysAgo(Math.max(0, seenDays - 1)),
      caseId: linkedCase.id,
      threatPatternId: 'TP-001',
      createdAt: daysAgo(seenDays + 3),
      updatedAt: daysAgo(Math.max(0, seenDays - 1)),
    });
  }

  await prisma.indicator.createMany({ data: indicatorsData });

  // 6. Seed 320 Scam Reports (>= 300 required)
  console.log('📋 Seeding 320 Scam Reports...');
  const reportStatuses = [
    'OPEN',
    'TRIAGED',
    'INVESTIGATING',
    'VERIFIED_SCAM',
    'ARCHIVED',
    'FALSE_POSITIVE',
  ] as const;
  const reporterChannels = [
    'WEB_PORTAL',
    'ANALYST_SUBMISSION',
    'API_INGEST',
    'THREAT_HUNT',
    'PARTNER_SHARE',
  ] as const;

  const reportsData: Array<{
    id: string;
    reportNumber: string;
    title: string;
    category: string;
    description: string;
    submittedIndicatorValue: string;
    submittedIndicatorType: string;
    riskLevel: string;
    riskScore: number;
    status: string;
    reporterChannel: string;
    detectionExplanation: string;
    triggeredRulesJson: string;
    financialLossAmount: number;
    currency: string;
    caseId: string;
    indicatorId: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (let i = 1; i <= 320; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `RPT-2026-${numStr}`;
    const linkedIndicator = indicatorsData[(i - 1) % indicatorsData.length];
    const linkedCase = casesData[(i - 1) % casesData.length];
    const category = linkedIndicator.category;
    const score =
      i % 15 === 0
        ? intBetween(12, 24) // Include LOW risk reports as well for full distribution
        : i % 5 === 0
        ? intBetween(26, 49)
        : i % 2 === 0
        ? intBetween(50, 74)
        : intBetween(75, 99);
    const level = getRiskLevel(score);
    const status =
      score < 25 && i % 30 === 0
        ? 'FALSE_POSITIVE'
        : reportStatuses[(i - 1) % 5];
    const createdDaysAgo = intBetween(0, 58);

    reportsData.push({
      id,
      reportNumber: id,
      title: `${category.replace('_', ' ')} Incident Report #${numStr} (${linkedIndicator.type})`,
      category,
      description: `Submitted investigation report regarding suspicious ${linkedIndicator.type} indicator "${linkedIndicator.value}". Reporter noted unsolicited communication attempting to induce urgent credential disclosure or unauthorized payment authorization.`,
      submittedIndicatorValue: linkedIndicator.value,
      submittedIndicatorType: linkedIndicator.type,
      riskLevel: level,
      riskScore: score,
      status,
      reporterChannel: reporterChannels[(i - 1) % reporterChannels.length],
      detectionExplanation: `Explainable Engine scored this submission at ${score}/100 (${level}). Primary factor: ${linkedIndicator.summaryReason} Corroborated against Case ${linkedCase.caseNumber}.`,
      triggeredRulesJson: JSON.stringify([
        {
          code:
            linkedIndicator.type === 'URL' || linkedIndicator.type === 'DOMAIN'
              ? 'URL-TYPOSQUAT-BRAND'
              : linkedIndicator.type === 'UPI'
              ? 'UPI-DECEPTIVE-COLLECT-HANDLE'
              : linkedIndicator.type === 'PHONE'
              ? 'PHONE-VIRTUAL-VOIP-PREFIX'
              : 'EMAIL-DISPLAY-DOMAIN-SPOOF',
          weight: Math.round(score * 0.55),
        },
        {
          code: 'INTEL-CORPUS-EXACT-MATCH',
          weight: Math.round(score * 0.45),
        },
      ]),
      financialLossAmount: i % 3 === 0 ? Number((intBetween(50, 4800) + rng()).toFixed(2)) : 0,
      currency: 'USD',
      caseId: linkedCase.id,
      indicatorId: linkedIndicator.id,
      createdById: investigatorIds[(i - 1) % investigatorIds.length],
      createdAt: daysAgo(createdDaysAgo, i % 20),
      updatedAt: daysAgo(Math.max(0, createdDaysAgo - 1), i % 10),
    });
  }

  await prisma.scamReport.createMany({ data: reportsData });

  // 7. Seed 160 Suspicious Message Samples (>= 150 required)
  console.log('💬 Seeding 160 Suspicious Message Samples...');
  const messageChannels = ['SMS', 'WHATSAPP', 'EMAIL', 'TELEGRAM', 'IN_APP'] as const;
  const messageTemplates = [
    {
      category: 'PHISHING',
      subject: 'URGENT: Your Bank Account Will Be Suspended Today',
      body: (url: string, phone: string) =>
        `FINAL NOTICE: Dear customer, your savings account KYC has expired and will be blocked within 24 hours. Immediately update your PAN and verify OTP at ${url} or call ${phone} to avoid penalty.`,
      signals: ['Urgency coercion (within 24 hours)', 'Account suspension threat', 'OTP & KYC solicitation'],
    },
    {
      category: 'UPI_FRAUD',
      subject: 'Instant Cashback & Pending Refund Approval',
      body: (url: string, upi: string) =>
        `Congratulations! Your refund of $245.00 is ready for settlement. Approve collect request from ${upi} and enter your UPI PIN to receive funds immediately, or visit ${url}.`,
      signals: ['Reverse UPI collect trap', 'Enter UPI PIN to receive lie', 'Deceptive refund VPA'],
    },
    {
      category: 'FAKE_JOB',
      subject: 'Part-Time Remote Digital Marketing & Map Rating Offer',
      body: (url: string, phone: string) =>
        `Hello! Earn $180 to $450 per day working from home with no experience needed.Simply rate Google Maps locations and complete VIP prepaid tasks. Contact our Telegram receptionist at ${phone} or register at ${url}.`,
      signals: ['Unrealistic daily wage claim', 'Prepaid VIP task lock-in', 'Off-platform recruiter steering'],
    },
    {
      category: 'DELIVERY_SCAM',
      subject: 'Shipment On Hold: Incomplete Delivery Address',
      body: (url: string, phone: string) =>
        `Logistics Alert: Your package could not be delivered today due to an incomplete street address and $2.40 customs duty pending. Update delivery preference immediately at ${url} or text ${phone} before warehouse return.`,
      signals: ['Parcel detention pretext', 'Nominal customs fee lure', 'Cloned tracking domain'],
    },
    {
      category: 'INVESTMENT_SCAM',
      subject: 'VIP Institutional Quant Signal – 200% Guaranteed Weekly ROI',
      body: (url: string, phone: string) =>
        `Exclusive invitation to our Institutional Quant Group! Enjoy risk-free trading with 200% profit guaranteed daily ROI. Double your crypto allocation tonight via ${url} or message analyst desk ${phone}.`,
      signals: ['Guaranteed 200% ROI promise', 'Risk-free trading deception', 'Unlicensed portal link'],
    },
    {
      category: 'IMPERSONATION',
      subject: 'Cyber Crime & Customs Compliance Warrant Notice',
      body: (url: string, phone: string) =>
        `OFFICIAL WARRANT ISSUED: Cyber Crime Department & Customs Officer notice regarding detained parcel in your identity. Connect immediately for digital verification at ${phone} and submit refundable security bond via ${url}.`,
      signals: ['Law enforcement impersonation', 'Digital arrest intimidation', 'Security bond transfer demand'],
    },
  ];

  const messagesData: Array<{
    id: string;
    sampleCode: string;
    channel: string;
    senderIdentifier: string;
    subject: string;
    content: string;
    category: string;
    riskScore: number;
    riskLevel: string;
    extractedIndicatorsJson: string;
    linguisticSignalsJson: string;
    explanation: string;
    indicatorId: string;
    createdAt: Date;
  }> = [];

  for (let i = 1; i <= 160; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `MSG-2026-${numStr}`;
    const tpl = messageTemplates[(i - 1) % messageTemplates.length];
    const urlInd = indicatorsData[(i - 1) % 180];
    const phoneInd = indicatorsData[320 + ((i - 1) % 210)];
    const upiInd = indicatorsData[740 + ((i - 1) % 80)];
    const secondArg = tpl.category === 'UPI_FRAUD' ? upiInd.value : phoneInd.value;
    const content = tpl.body(urlInd.value, secondArg);
    const score = intBetween(58, 98);
    const level = getRiskLevel(score);

    messagesData.push({
      id,
      sampleCode: id,
      channel: messageChannels[(i - 1) % messageChannels.length],
      senderIdentifier: i % 2 === 0 ? phoneInd.value : indicatorsData[530 + ((i - 1) % 210)].value,
      subject: `${tpl.subject} [Sample #${numStr}]`,
      content,
      category: tpl.category,
      riskScore: score,
      riskLevel: level,
      extractedIndicatorsJson: JSON.stringify([urlInd.value, secondArg]),
      linguisticSignalsJson: JSON.stringify(tpl.signals),
      explanation: `Linguistic analysis identified high-coercion phrasing (${tpl.signals.join(', ')}) combined with embedded synthetic indicator ${urlInd.value}.`,
      indicatorId: urlInd.id,
      createdAt: daysAgo(intBetween(1, 50), i % 12),
    });
  }

  await prisma.messageSample.createMany({ data: messagesData });

  // 8. Seed 160 Synthetic Transaction Records (>= 150 required)
  console.log('💳 Seeding 160 Synthetic Transaction Records...');
  const paymentRails = ['UPI', 'WIRE_TRANSFER', 'ACH', 'CARD_P2P', 'CRYPTO_TESTNET'] as const;
  const txnStatuses = ['FLAGGED', 'HELD_FOR_REVIEW', 'BLOCKED_DEMO', 'REPORTED_DISPUTE'] as const;
  const txnPrefixes = ['UTR-MULE', 'TXN-FRD', 'REV-COLLECT', 'WIRE-URG', 'UPI-PULL'];

  const transactionsData: Array<{
    id: string;
    referenceId: string;
    paymentRail: string;
    senderHandle: string;
    receiverHandle: string;
    merchantDisplayName: string;
    amount: number;
    currency: string;
    riskScore: number;
    riskLevel: string;
    status: string;
    scamCategory: string;
    anomalyFlagsJson: string;
    explanation: string;
    indicatorId: string;
    caseId: string;
    createdAt: Date;
  }> = [];

  for (let i = 1; i <= 160; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `TXN-2026-${numStr}`;
    const prefix = txnPrefixes[(i - 1) % txnPrefixes.length];
    const referenceId = `${prefix}-2026${numStr}`;
    const upiInd = indicatorsData[740 + ((i - 1) % 80)];
    const linkedCase = casesData[(i - 1) % casesData.length];
    const rail = paymentRails[(i - 1) % paymentRails.length];
    const score = intBetween(45, 97);
    const level = getRiskLevel(score);
    const amount = Number((intBetween(49, 9800) + 0.99).toFixed(2));

    transactionsData.push({
      id,
      referenceId,
      paymentRail: rail,
      senderHandle: `victim.acct.${numStr}@retailbank.example`,
      receiverHandle: upiInd.value,
      merchantDisplayName:
        rail === 'UPI'
          ? `Refund Verification Desk #${ (i % 20) + 1 }`
          : `Global Escrow Settlement #${ (i % 15) + 1 }`,
      amount,
      currency: 'USD',
      riskScore: score,
      riskLevel: level,
      status: txnStatuses[(i - 1) % txnStatuses.length],
      scamCategory: SCAM_CATEGORIES[(i - 1) % SCAM_CATEGORIES.length],
      anomalyFlagsJson: JSON.stringify([
        'Deceptive beneficiary handle',
        'First-time high-velocity transfer',
        'Mule dispersion corridor match',
      ]),
      explanation: `Transaction ${referenceId} ($${amount}) routed to flagged synthetic handle ${upiInd.value} exhibiting rapid settlement dispersion.`,
      indicatorId: upiInd.id,
      caseId: linkedCase.id,
      createdAt: daysAgo(intBetween(1, 45), i % 18),
    });
  }

  await prisma.transactionEvent.createMany({ data: transactionsData });

  // 9. Seed 120 Evidence Artifacts (>= 100 required)
  console.log('🔒 Seeding 120 Evidence Vault Artifacts...');
  const evidenceTypes = [
    'SCREENSHOT_METADATA',
    'EMAIL_HEADER',
    'DOM_SNAPSHOT',
    'TRANSACTION_RECEIPT',
    'CHAT_TRANSCRIPT',
    'DNS_RECORD_SYNTHETIC',
  ] as const;
  const verificationStatuses = [
    'VERIFIED',
    'INTEGRITY_CHECKED',
    'PENDING_VERIFICATION',
    'NEEDS_CORROBORATION',
  ] as const;

  const evidenceData: Array<{
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
    reportId: string;
    uploadedById: string;
    createdAt: Date;
  }> = [];

  for (let i = 1; i <= 120; i++) {
    const numStr = String(i).padStart(4, '0');
    const id = `EVD-2026-${numStr}`;
    const evType = evidenceTypes[(i - 1) % evidenceTypes.length];
    const linkedCase = casesData[(i - 1) % casesData.length];
    const linkedReport = reportsData[(i - 1) % reportsData.length];
    const ext =
      evType === 'SCREENSHOT_METADATA'
        ? 'png'
        : evType === 'EMAIL_HEADER'
        ? 'eml'
        : evType === 'DOM_SNAPSHOT'
        ? 'html'
        : evType === 'TRANSACTION_RECEIPT'
        ? 'pdf'
        : 'json';
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'pdf'
        ? 'application/pdf'
        : ext === 'html'
        ? 'text/html'
        : 'text/plain';

    evidenceData.push({
      id,
      evidenceCode: id,
      title: `${evType.replace(/_/g, ' ')} Artifact for ${linkedCase.caseNumber}`,
      type: evType,
      description: `Forensic ${evType.toLowerCase().replace(/_/g, ' ')} captured during triage of ${linkedReport.reportNumber}. Contains preserved synthetic indicator telemetry and timestamped custody hash.`,
      fileName: `scamtrace_evidence_${numStr}.${ext}`,
      mimeType: mime,
      fileSizeBytes: intBetween(18400, 1450000),
      sha256Hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852${numStr}`,
      storageMode: 'metadata-local',
      verificationStatus: verificationStatuses[(i - 1) % verificationStatuses.length],
      chainOfCustodyNotes: `Logged by ${investigatorIds[(i - 1) % investigatorIds.length]} via ScamTrace Evidence Vault; SHA-256 digest verified at ingestion.`,
      caseId: linkedCase.id,
      reportId: linkedReport.id,
      uploadedById: investigatorIds[(i - 1) % investigatorIds.length],
      createdAt: daysAgo(intBetween(1, 45), i % 12),
    });
  }

  await prisma.evidence.createMany({ data: evidenceData });

  // 10. Seed 260 Entity Relationships for the Interactive Graph (/app/entity-network)
  console.log('🕸️ Seeding 260 Entity Relationship Network Edges...');
  const relationshipsData: Array<{
    id: string;
    sourceType: string;
    sourceId: string;
    sourceLabel: string;
    sourceRiskLevel: string;
    targetType: string;
    targetId: string;
    targetLabel: string;
    targetRiskLevel: string;
    relationshipType: string;
    evidenceSummary: string;
    weight: number;
    createdAt: Date;
  }> = [];

  for (let i = 1; i <= 90; i++) {
    const rpt = reportsData[i - 1];
    const ind = indicatorsData[i - 1];
    relationshipsData.push({
      id: `REL-${String(relationshipsData.length + 1).padStart(4, '0')}`,
      sourceType: 'REPORT',
      sourceId: rpt.id,
      sourceLabel: rpt.reportNumber,
      sourceRiskLevel: rpt.riskLevel,
      targetType: ind.type,
      targetId: ind.id,
      targetLabel: ind.value.length > 34 ? `${ind.value.slice(0, 31)}...` : ind.value,
      targetRiskLevel: ind.riskLevel,
      relationshipType: 'CONTAINS_INDICATOR',
      evidenceSummary: `Report ${rpt.reportNumber} submitted indicator ${ind.id}`,
      weight: 1.0,
      createdAt: rpt.createdAt,
    });
  }

  for (let i = 1; i <= 90; i++) {
    const ind = indicatorsData[i - 1];
    const invCase = casesData[(i - 1) % casesData.length];
    relationshipsData.push({
      id: `REL-${String(relationshipsData.length + 1).padStart(4, '0')}`,
      sourceType: ind.type,
      sourceId: ind.id,
      sourceLabel: ind.value.length > 34 ? `${ind.value.slice(0, 31)}...` : ind.value,
      sourceRiskLevel: ind.riskLevel,
      targetType: 'CASE',
      targetId: invCase.id,
      targetLabel: invCase.caseNumber,
      targetRiskLevel: invCase.riskLevel,
      relationshipType: 'INVESTIGATED_IN',
      evidenceSummary: `Indicator ${ind.id} linked to investigation ${invCase.caseNumber}`,
      weight: 1.2,
      createdAt: invCase.createdAt,
    });
  }

  for (let i = 1; i <= 40; i++) {
    const msg = messagesData[i - 1];
    const phoneInd = indicatorsData[320 + (i - 1)];
    relationshipsData.push({
      id: `REL-${String(relationshipsData.length + 1).padStart(4, '0')}`,
      sourceType: 'MESSAGE',
      sourceId: msg.id,
      sourceLabel: msg.sampleCode,
      sourceRiskLevel: msg.riskLevel,
      targetType: 'PHONE',
      targetId: phoneInd.id,
      targetLabel: phoneInd.value,
      targetRiskLevel: phoneInd.riskLevel,
      relationshipType: 'CO_OCCURS_IN_MESSAGE',
      evidenceSummary: `Message sample ${msg.sampleCode} originated from or references ${phoneInd.value}`,
      weight: 1.0,
      createdAt: msg.createdAt,
    });
  }

  for (let i = 1; i <= 40; i++) {
    const txn = transactionsData[i - 1];
    const upiInd = indicatorsData[740 + (i - 1)];
    relationshipsData.push({
      id: `REL-${String(relationshipsData.length + 1).padStart(4, '0')}`,
      sourceType: 'TRANSACTION',
      sourceId: txn.id,
      sourceLabel: txn.referenceId,
      sourceRiskLevel: txn.riskLevel,
      targetType: 'UPI',
      targetId: upiInd.id,
      targetLabel: upiInd.value,
      targetRiskLevel: upiInd.riskLevel,
      relationshipType: 'SETTLES_TO_HANDLE',
      evidenceSummary: `Transaction ${txn.referenceId} ($${txn.amount}) settles to handle ${upiInd.value}`,
      weight: 1.3,
      createdAt: txn.createdAt,
    });
  }

  await prisma.entityRelationship.createMany({ data: relationshipsData });

  // 11. Seed 110 Case Notes
  console.log('📝 Seeding 110 Investigation Case Notes...');
  const notesData = casesData.map((c, idx) => ({
    id: `NOTE-2026-${String(idx + 1).padStart(4, '0')}`,
    caseId: c.id,
    authorId: c.assignedToId,
    authorName: users.find((u) => u.id === c.assignedToId)?.fullName || 'Marcus Chen',
    noteType: idx % 3 === 0 ? 'TRIAGE_SUMMARY' : 'ANALYST_NOTE',
    content: `Initial forensic triage completed for ${c.caseNumber}. Verified synthetic indicator correlations and confirmed rule-weight attribution across linked scam reports.`,
    createdAt: c.updatedAt,
  }));
  await prisma.caseNote.createMany({ data: notesData });

  // 12. Seed 40 Historical Analysis Results + 80 Detection Factors
  console.log('🧠 Seeding 40 Historical Explainable Analyses & 80 Detection Factors...');
  for (let i = 1; i <= 40; i++) {
    const numStr = String(i).padStart(4, '0');
    const analysisId = `ANL-2026-${numStr}`;
    const ind = indicatorsData[(i * 7) % indicatorsData.length];
    const inputType = ind.type === 'DOMAIN' ? 'URL' : ind.type;
    const rule1 = DEFAULT_DETECTION_RULES[(i - 1) % DEFAULT_DETECTION_RULES.length];
    const rule2 = DEFAULT_DETECTION_RULES[18]; // INTEL-CORPUS-EXACT-MATCH

    await prisma.analysisResult.create({
      data: {
        id: analysisId,
        inputType,
        rawInput: ind.value,
        normalizedInput: ind.normalizedValue,
        riskScore: ind.riskScore,
        riskLevel: ind.riskLevel,
        heuristicConfidence: ind.confidenceScore,
        verdictSummary: `${ind.riskLevel} Fraud Risk (${ind.riskScore}/100): Matched ${rule1.code} and ${rule2.code}.`,
        detailedExplanation: ind.summaryReason,
        extractedIndicatorsJson: JSON.stringify([
          {
            type: ind.type,
            value: ind.value,
            normalizedValue: ind.normalizedValue,
            context: 'Seeded historical analysis indicator',
            matchedInDatabase: true,
            existingIndicatorId: ind.id,
          },
        ]),
        recommendedActionsJson: JSON.stringify([
          'Perform out-of-band verification before acting on indicator.',
          'Review linked reports in Investigation Case.',
        ]),
        limitationsJson: JSON.stringify([
          'Rule-Based Heuristic Demonstration on synthetic telemetry.',
        ]),
        userId: investigatorIds[i % investigatorIds.length],
        createdAt: daysAgo(intBetween(0, 30), i % 12),
        factors: {
          create: [
            {
              ruleId: rule1.id,
              ruleCode: rule1.code,
              factorName: rule1.name,
              category: rule1.category,
              severity: rule1.severity,
              scoreContribution: rule1.scoreWeight,
              matchedEvidence: `Matched pattern on "${ind.value}"`,
              explanation: rule1.explanationTemplate,
            },
            {
              ruleId: rule2.id,
              ruleCode: rule2.code,
              factorName: rule2.name,
              category: rule2.category,
              severity: rule2.severity,
              scoreContribution: Math.max(10, ind.riskScore - rule1.scoreWeight),
              matchedEvidence: `Cataloged as ${ind.id} in ScamTrace Threat Intelligence`,
              explanation: rule2.explanationTemplate,
            },
          ],
        },
      },
    });
  }

  // 13. Seed 35 Alerts & Notifications
  console.log('🔔 Seeding 35 Alerts & Notification Center Events...');
  const alertCategories = [
    'HIGH_RISK_ANALYSIS',
    'NEW_INVESTIGATION',
    'CASE_ASSIGNMENT',
    'EVIDENCE_UPDATE',
    'RULE_MODIFICATION',
  ] as const;
  const alertSeverities = ['CRITICAL', 'HIGH', 'WARNING', 'INFO'] as const;

  const alertsData = Array.from({ length: 35 }, (_, idx) => {
    const i = idx + 1;
    const cat = alertCategories[idx % alertCategories.length];
    const sev = alertSeverities[idx % alertSeverities.length];
    const linkedCase = casesData[idx % casesData.length];
    return {
      id: `ALT-2026-${String(i).padStart(4, '0')}`,
      title:
        cat === 'HIGH_RISK_ANALYSIS'
          ? `Critical Scam Indicator Detected (${linkedCase.riskScore}/100)`
          : cat === 'NEW_INVESTIGATION'
          ? `New Investigation Opened: ${linkedCase.caseNumber}`
          : cat === 'CASE_ASSIGNMENT'
          ? `Case ${linkedCase.caseNumber} Assigned to Threat Operations`
          : cat === 'EVIDENCE_UPDATE'
          ? `Forensic Artifact Verified in ${linkedCase.caseNumber}`
          : `Detection Rule Weight Calibrated (URL-TYPOSQUAT-BRAND)`,
      message: `Automated telemetry notification for ${linkedCase.title}. Review explainable factors and linked entity network.`,
      category: cat,
      severity: sev,
      isRead: i > 12,
      actionUrl:
        cat === 'HIGH_RISK_ANALYSIS'
          ? '/app/analyze'
          : cat === 'RULE_MODIFICATION'
          ? '/app/rules'
          : `/app/investigations`,
      relatedEntityId: linkedCase.id,
      userId: investigatorIds[idx % investigatorIds.length],
      createdAt: daysAgo(Math.floor(idx / 2), idx % 12),
    };
  });
  await prisma.alert.createMany({ data: alertsData });

  // 14. Seed 60 Audit Logs
  console.log('🛡️ Seeding 60 Immutable Audit Log Records...');
  const auditActions = [
    'USER_LOGIN',
    'ANALYSIS_EXECUTED',
    'REPORT_CREATED',
    'CASE_CREATED',
    'CASE_ASSIGNED',
    'CASE_STATUS_CHANGED',
    'EVIDENCE_ADDED',
    'RULE_UPDATED',
    'DATA_EXPORTED',
  ] as const;

  const auditLogsData = Array.from({ length: 60 }, (_, idx) => {
    const u = users[idx % users.length];
    const action = auditActions[idx % auditActions.length];
    const linkedCase = casesData[idx % casesData.length];
    return {
      id: `AUD-2026-${String(idx + 1).padStart(4, '0')}`,
      action,
      actorId: u.id,
      actorEmail: u.email,
      actorRole: u.role,
      targetType: action.includes('CASE')
        ? 'InvestigationCase'
        : action.includes('RULE')
        ? 'DetectionRule'
        : action.includes('EVIDENCE')
        ? 'Evidence'
        : 'ScamReport',
      targetId: linkedCase.id,
      summary: `${u.fullName} (${u.role}) executed ${action} on ${linkedCase.caseNumber}`,
      metadataJson: JSON.stringify({
        environment: 'Demo Workspace',
        caseNumber: linkedCase.caseNumber,
        verifiedRole: u.role,
      }),
      ipAddress: `10.24.10.${(idx % 50) + 10}`,
      createdAt: daysAgo(Math.floor(idx / 3), idx % 24),
    };
  });
  await prisma.auditLog.createMany({ data: auditLogsData });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

