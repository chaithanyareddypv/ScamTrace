import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRiskLevelFromScore } from '@/lib/utils';
import { DEFAULT_DETECTION_RULES, type RuleDefinition } from '@/services/default-rules';
import type {
  AnalysisInputType,
  ExplainableAnalysisOutput,
  ExtractedIndicatorItem,
  RiskLevel,
  TriggeredFactorDetail,
} from '@/types/scamtrace';

export const AnalyzeInputSchema = z.object({
  inputType: z.enum(['URL', 'EMAIL', 'PHONE', 'MESSAGE', 'UPI', 'TRANSACTION']),
  rawInput: z
    .string()
    .min(3, 'Input must be at least 3 characters long')
    .max(5000, 'Input cannot exceed 5,000 characters'),
  saveToDatabase: z.boolean().optional().default(true),
});

export function normalizeIndicatorInput(
  inputType: AnalysisInputType,
  rawInput: string
): string {
  const trimmed = rawInput.trim();
  switch (inputType) {
    case 'URL':
    case 'EMAIL':
    case 'UPI':
      return trimmed.toLowerCase();
    case 'PHONE':
      return trimmed.replace(/[^\d+]/g, '');
    case 'TRANSACTION':
      return trimmed.toUpperCase().replace(/\s+/g, '');
    case 'MESSAGE':
    default:
      return trimmed.replace(/\s+/g, ' ');
  }
}

export function extractIndicatorsFromInput(
  inputType: AnalysisInputType,
  rawInput: string
): ExtractedIndicatorItem[] {
  const extracted: ExtractedIndicatorItem[] = [];
  const seen = new Set<string>();

  const addIndicator = (type: string, value: string, context: string) => {
    const norm = value.trim().toLowerCase();
    const key = `${type}:${norm}`;
    if (!norm || seen.has(key)) return;
    seen.add(key);
    extracted.push({
      type,
      value: value.trim(),
      normalizedValue: norm,
      context,
    });
  };

  if (inputType === 'URL') {
    addIndicator('URL', rawInput, 'Primary submitted URL indicator');
    try {
      const withProto = /^https?:\/\//i.test(rawInput.trim())
        ? rawInput.trim()
        : `http://${rawInput.trim()}`;
      const parsed = new URL(withProto);
      if (parsed.hostname) {
        addIndicator('DOMAIN', parsed.hostname, 'Hostname parsed from submitted URL');
      }
    } catch {
      // Untrusted malformed URL; fallback regex extraction
    }
  } else if (inputType === 'EMAIL') {
    const emailMatches = rawInput.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches && emailMatches.length > 0) {
      emailMatches.forEach((em) => {
        addIndicator('EMAIL', em, 'Extracted email address');
        const domainPart = em.split('@')[1];
        if (domainPart) {
          addIndicator('DOMAIN', domainPart, 'Sender domain extracted from email');
        }
      });
    } else {
      addIndicator('EMAIL', rawInput, 'Submitted email string');
    }
  } else if (inputType === 'PHONE') {
    addIndicator('PHONE', rawInput, 'Primary submitted phone number');
  } else if (inputType === 'UPI') {
    addIndicator('UPI', rawInput, 'Primary submitted UPI Virtual Payment Address');
  } else if (inputType === 'TRANSACTION') {
    addIndicator('TRANSACTION', rawInput, 'Primary submitted transaction reference');
  }

  // Always scan text for embedded URLs, emails, phones, UPI handles, and transaction refs
  const urlRegex = /https?:\/\/[^\s"'<>]+|[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+\/(?:[^\s"'<>]*)/gi;
  const urls = rawInput.match(urlRegex) || [];
  for (const u of urls) {
    addIndicator('URL', u, 'Embedded URL extracted from content');
  }

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = rawInput.match(emailRegex) || [];
  for (const e of emails) {
    addIndicator('EMAIL', e, 'Embedded email address');
  }

  const upiRegex = /[a-zA-Z0-9.\-_]{3,}@(?:okaxis|okhdfcbank|okicici|oksbi|ybl|paytm|ibl|upi|apl|tempbank|fastpaytest|anonwallet|sandboxupi|fakepsp)\b/gi;
  const upis = rawInput.match(upiRegex) || [];
  for (const vpa of upis) {
    addIndicator('UPI', vpa, 'Embedded UPI handle (VPA)');
  }

  const phoneRegex = /(?:\+\d{1,3}[-\s]?)?\(?\d{3,5}\)?[-\s]?\d{3,4}[-\s]?\d{3,4}/g;
  const phones = rawInput.match(phoneRegex) || [];
  for (const p of phones) {
    const digitsOnly = p.replace(/\D/g, '');
    if (digitsOnly.length >= 9 && digitsOnly.length <= 15) {
      addIndicator('PHONE', p, 'Embedded phone number');
    }
  }

  const txnRegex = /\b(?:UTR|TXN|REV|WIRE|UPI|REF)[-\s]?[A-Z0-9]{6,18}\b/gi;
  const txns = rawInput.match(txnRegex) || [];
  for (const t of txns) {
    addIndicator('TRANSACTION', t, 'Embedded transaction reference identifier');
  }

  if (extracted.length === 0) {
    addIndicator(inputType, rawInput, 'Submitted content fingerprint');
  }

  return extracted;
}

export async function runExplainableAnalysis(params: {
  inputType: AnalysisInputType;
  rawInput: string;
  userId?: string;
  saveToDatabase?: boolean;
}): Promise<ExplainableAnalysisOutput> {
  const { inputType, rawInput, userId, saveToDatabase = true } = params;
  const normalizedInput = normalizeIndicatorInput(inputType, rawInput);
  const lowerInput = rawInput.toLowerCase();

  // Load active rules from DB, falling back to DEFAULT_DETECTION_RULES if DB isn't seeded yet
  let activeRules: RuleDefinition[] = [];
  try {
    const dbRules = await prisma.detectionRule.findMany({
      where: { isActive: true },
    });
    if (dbRules.length > 0) {
      activeRules = dbRules.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        category: r.category as RuleDefinition['category'],
        targetTypes: r.targetTypes,
        severity: r.severity as RuleDefinition['severity'],
        scoreWeight: r.scoreWeight,
        maxWeight: r.maxWeight,
        isActive: r.isActive,
        matchCount: r.matchCount,
        precisionEstimate: r.precisionEstimate,
        patternConfigJson: r.patternConfigJson,
        explanationTemplate: r.explanationTemplate,
      }));
    } else {
      activeRules = DEFAULT_DETECTION_RULES.filter((r) => r.isActive);
    }
  } catch {
    activeRules = DEFAULT_DETECTION_RULES.filter((r) => r.isActive);
  }

  const ruleMap = new Map<string, RuleDefinition>();
  for (const r of activeRules) {
    ruleMap.set(r.code, r);
  }

  const extractedIndicators = extractIndicatorsFromInput(inputType, rawInput);
  const triggeredFactors: TriggeredFactorDetail[] = [];

  const triggerRule = (code: string, matchedEvidence: string, customDetail?: string) => {
    const rule = ruleMap.get(code);
    if (!rule) return;
    if (triggeredFactors.some((f) => f.ruleCode === code)) return;

    triggeredFactors.push({
      ruleId: rule.id,
      ruleCode: rule.code,
      factorName: rule.name,
      category: rule.category,
      severity: rule.severity,
      scoreContribution: rule.scoreWeight,
      matchedEvidence,
      explanation: customDetail
        ? `${rule.explanationTemplate} (${customDetail})`
        : rule.explanationTemplate,
      description: rule.description,
    });
  };

  // 1. Check Threat Intelligence Database for exact or stem matches
  let threatIntelBonus = 0;
  try {
    const candidateValues = Array.from(
      new Set([
        rawInput.trim(),
        normalizedInput,
        ...extractedIndicators.map((i) => i.value),
        ...extractedIndicators.map((i) => i.normalizedValue),
      ])
    );

    const dbMatches = await prisma.indicator.findMany({
      where: {
        OR: [
          { value: { in: candidateValues } },
          { normalizedValue: { in: candidateValues } },
        ],
      },
      take: 5,
    });

    if (dbMatches.length > 0) {
      const topMatch = dbMatches[0];
      for (const item of extractedIndicators) {
        if (
          item.normalizedValue === topMatch.normalizedValue.toLowerCase() ||
          item.value.toLowerCase() === topMatch.value.toLowerCase()
        ) {
          item.matchedInDatabase = true;
          item.existingIndicatorId = topMatch.id;
          item.existingRiskScore = topMatch.riskScore;
        }
      }
      triggerRule(
        'INTEL-CORPUS-EXACT-MATCH',
        `Matched Indicator ${topMatch.id} (${topMatch.value}) [Historical Risk: ${topMatch.riskScore}/100, Associations: ${topMatch.associationCount}]`,
        `Cataloged under ${topMatch.category}: ${topMatch.summaryReason}`
      );
      threatIntelBonus = Math.min(18, Math.round(topMatch.riskScore * 0.15));
    } else {
      // Check stem correlation for domains or UPI handles
      const domainOrHandleStems = extractedIndicators
        .filter((i) => i.type === 'DOMAIN' || i.type === 'UPI')
        .map((i) =>
          i.normalizedValue
            .replace(/^https?:\/\//, '')
            .split('/')[0]
            .split('@')[0]
            .split('.')[0]
        )
        .filter(
          (s) =>
            s.length >= 7 &&
            !['library', 'university', 'campus', 'faculty', 'student', 'docs'].includes(s)
        );

      if (domainOrHandleStems.length > 0) {
        const stemMatch = await prisma.indicator.findFirst({
          where: {
            normalizedValue: { contains: domainOrHandleStems[0] },
          },
        });
        if (stemMatch) {
          triggerRule(
            'INTEL-CAMPAIGN-INFRASTRUCTURE',
            `Correlated stem "${domainOrHandleStems[0]}" with cataloged indicator ${stemMatch.id} (${stemMatch.value})`
          );
        }
      }
    }
  } catch {
    // Database optional during isolated unit tests
  }

  // 2. Evaluate URL & Domain Rules
  const brandLookalikes = [
    'paypa1',
    'pay-pal',
    'stripe-verify',
    'chase-secure',
    'hdfc-kyc',
    'sbi-online',
    'icici-alert',
    'amazon-parcel',
    'dhl-customs',
    'fedex-redelivery',
    'irs-refund',
    'gov-tax',
    'appleid-unlock',
    'microsoft-auth',
    'binance-claim',
    'bank-verify',
    'secure-kyc',
    'netflix-billing',
    'usps-track',
    'indiapost-parcel',
  ];
  const matchedBrands = brandLookalikes.filter((b) => lowerInput.includes(b));
  if (matchedBrands.length > 0) {
    triggerRule(
      'URL-TYPOSQUAT-BRAND',
      `Detected deceptive brand/impersonation token(s): ${matchedBrands.join(', ')}`
    );
  }

  const suspiciousTlds = [
    '.xyz',
    '.top',
    '.click',
    '.loan',
    '.work',
    '.zip',
    '.kim',
    '.gq',
    '.cf',
    '.buzz',
    '.rest',
  ];
  const matchedTld = suspiciousTlds.find((tld) => lowerInput.includes(tld));
  const subdomainParts =
    inputType === 'URL'
      ? lowerInput
          .replace(/^https?:\/\//, '')
          .split('/')[0]
          .split('.')
      : [];
  if (matchedTld || subdomainParts.length >= 4) {
    triggerRule(
      'URL-SUSPICIOUS-TLD',
      matchedTld
        ? `High-abuse TLD pattern "${matchedTld}" detected in host`
        : `Deep subdomain nesting (${subdomainParts.length} labels: ${subdomainParts.join('.')})`
    );
  }

  const credPaths = [
    'verify-kyc',
    'login-secure',
    'update-pan',
    'account-unlock',
    'claim-refund',
    'validate-otp',
    'wallet-connect',
    'reset-pin',
    'token=',
    'session_verify=',
    'signin-challenge',
    'confirm-identity',
  ];
  const matchedCredPaths = credPaths.filter((p) => lowerInput.includes(p));
  if (matchedCredPaths.length > 0) {
    triggerRule(
      'URL-CREDENTIAL-PATH',
      `Credential/KYC endpoint signature(s): ${matchedCredPaths.join(', ')}`
    );
  }

  const hasPunycode = lowerInput.includes('xn--');
  const hasIpHost = /(?:https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}(?:[:/]|$)/.test(lowerInput);
  const hasAtRedirect = /^https?:\/\/[^/]+@[^/]+/.test(lowerInput);
  if (hasPunycode || hasIpHost || hasAtRedirect) {
    const reasons: string[] = [];
    if (hasPunycode) reasons.push('Punycode IDN homograph prefix (xn--)');
    if (hasIpHost) reasons.push('Raw IPv4 host address instead of domain name');
    if (hasAtRedirect) reasons.push('URL authority "@" credential redirection');
    triggerRule('URL-IP-OR-PUNYCODE', reasons.join('; '));
  }

  if (
    lowerInput.startsWith('http://') &&
    (matchedCredPaths.length > 0 || matchedBrands.length > 0 || lowerInput.includes('bank') || lowerInput.includes('login'))
  ) {
    triggerRule(
      'URL-UNENCRYPTED-HTTP',
      'Unencrypted cleartext protocol (http://) paired with sensitive authentication/banking terms'
    );
  }

  if (
    (inputType === 'URL' && rawInput.length > 95) ||
    lowerInput.includes('redirect=') ||
    lowerInput.includes('%2f%2f') ||
    lowerInput.includes('base64')
  ) {
    triggerRule(
      'URL-EXCESSIVE-LENGTH-OBFUSCATION',
      `URL length (${rawInput.length} chars) or encoded redirect parameter obfuscation`
    );
  }

  // 3. Evaluate Message & Linguistic Rules
  const urgencyPhrases = [
    'immediately',
    'within 24 hours',
    'within 2 hours',
    'account will be blocked',
    'suspended today',
    'final notice',
    'urgent action required',
    'electricity will be disconnected',
    'warrant issued',
    'customs clearance pending',
    'avoid penalty',
    'immediate suspension',
    'expire tonight',
    'blocked permanently',
  ];
  const matchedUrgency = urgencyPhrases.filter((p) => lowerInput.includes(p));
  if (matchedUrgency.length > 0) {
    triggerRule(
      'MSG-URGENCY-COERCION',
      `Coercive urgency phrase(s): "${matchedUrgency.join('", "')}"`
    );
  }

  const otpTokens = [
    'share otp',
    'enter your otp',
    'upi pin',
    'mpin',
    'cvv',
    'seed phrase',
    'recovery phrase',
    'anydesk',
    'teamviewer',
    'confirm your pin',
    'provide otp',
    'send the 6-digit code',
  ];
  const matchedOtp = otpTokens.filter((t) => lowerInput.includes(t));
  if (matchedOtp.length > 0) {
    triggerRule(
      'MSG-OTP-PIN-SOLICITATION',
      `High-risk credential/remote-access solicitation: "${matchedOtp.join('", "')}"`
    );
  }

  const jobScamPhrases = [
    'per day working from home',
    'rate google maps',
    'like youtube videos',
    'prepaid task',
    'registration fee',
    'vip task group',
    'telegram receptionist',
    'daily commission',
    'hotel review task',
    'part-time remote earn',
  ];
  const matchedJob = jobScamPhrases.filter((p) => lowerInput.includes(p));
  if (matchedJob.length > 0) {
    triggerRule(
      'MSG-FAKE-JOB-RECRUITMENT',
      `Task/recruitment scam indicator(s): "${matchedJob.join('", "')}"`
    );
  }

  const deliveryPhrases = [
    'package could not be delivered',
    'incomplete address',
    'pay redelivery fee',
    'customs duty pending',
    'warehouse return',
    'update delivery preference',
    'shipment on hold',
    'parcel detained',
  ];
  const matchedDelivery = deliveryPhrases.filter((p) => lowerInput.includes(p));
  if (matchedDelivery.length > 0) {
    triggerRule(
      'MSG-DELIVERY-CUSTOMS-SCAM',
      `Parcel/customs interception lure: "${matchedDelivery.join('", "')}"`
    );
  }

  const investmentPhrases = [
    'guaranteed return',
    '200% profit',
    'risk-free trading',
    'institutional quant group',
    'double your crypto',
    'guaranteed daily roi',
    'insider stock signal',
    '100% profit guarantee',
    'vip forex signal',
  ];
  const matchedInvestment = investmentPhrases.filter((p) => lowerInput.includes(p));
  if (matchedInvestment.length > 0) {
    triggerRule(
      'MSG-INVESTMENT-GUARANTEED-RETURN',
      `Unrealistic investment promise: "${matchedInvestment.join('", "')}"`
    );
  }

  const authorityPhrases = [
    'cyber crime department',
    'income tax department',
    'customs officer',
    'reserve bank notice',
    'ceo urgent request',
    'gift cards for client',
    'digital arrest',
    'supreme court warrant',
    'narcotics bureau',
  ];
  const matchedAuthority = authorityPhrases.filter((p) => lowerInput.includes(p));
  if (matchedAuthority.length > 0) {
    triggerRule(
      'MSG-IMPERSONATION-AUTHORITY',
      `Authority impersonation marker(s): "${matchedAuthority.join('", "')}"`
    );
  }

  const techSupportPhrases = [
    'auto-renewal invoice',
    'geek squad',
    'windows defender alert',
    'call support immediately to cancel',
    'trojan detected',
    'subscription charged $',
  ];
  const matchedTech = techSupportPhrases.filter((p) => lowerInput.includes(p));
  if (matchedTech.length > 0) {
    triggerRule(
      'MSG-TECH-SUPPORT-CALLBACK',
      `Tech-support callback lure: "${matchedTech.join('", "')}"`
    );
  }

  const qrReversePhrases = [
    'scan qr to receive',
    'enter pin to receive',
    'approve collect request to get refund',
    'scan and enter mpin',
    'enter upi pin to claim',
  ];
  const matchedQr = qrReversePhrases.filter((p) => lowerInput.includes(p));
  if (matchedQr.length > 0) {
    triggerRule(
      'PAYMENT-QR-REVERSE-TRAP',
      `Deceptive collect/QR instruction: "${matchedQr.join('", "')}"`
    );
  }

  // 4. Evaluate UPI Rules
  const upiDeceptiveTokens = [
    'refund',
    'cashback',
    'kycdesk',
    'care.help',
    'customercare',
    'pmcare',
    'taxrefund',
    'lottery',
    'rewardclaim',
    'verifyaccount',
    'unblock',
    'helpline',
  ];
  if (inputType === 'UPI' || extractedIndicators.some((i) => i.type === 'UPI') || lowerInput.includes('@')) {
    const matchedUpiTokens = upiDeceptiveTokens.filter((t) => lowerInput.includes(t));
    if (matchedUpiTokens.length > 0) {
      triggerRule(
        'UPI-DECEPTIVE-COLLECT-HANDLE',
        `Deceptive VPA handle token(s): "${matchedUpiTokens.join('", "')}"`
      );
    }

    const suspiciousPsps = [
      '@tempbank',
      '@fastpaytest',
      '@anonwallet',
      '@sandboxupi',
      '@fakepsp',
      '@claimpay',
    ];
    const matchedPsp = suspiciousPsps.find((psp) => lowerInput.includes(psp));
    const hasHighDigitHandle = /^[a-z]{1,3}\d{6,}@/i.test(rawInput.trim());
    if (matchedPsp || (inputType === 'UPI' && hasHighDigitHandle)) {
      triggerRule(
        'UPI-UNRECOGNIZED-PSP-FORMAT',
        matchedPsp
          ? `Untrusted synthetic PSP suffix "${matchedPsp}"`
          : `Numeric-heavy burner VPA handle format "${rawInput.trim()}"`
      );
    }
  }

  // 5. Evaluate Email Rules
  if (inputType === 'EMAIL' || extractedIndicators.some((i) => i.type === 'EMAIL')) {
    const brandPrefixes = [
      'support',
      'security',
      'billing',
      'kyc',
      'fraud',
      'compliance',
      'ceo',
      'payroll',
      'customs',
      'helpdesk',
      'admin',
    ];
    const suspiciousEmailDomains = [
      '.example',
      '.test',
      'verify',
      'alert',
      'secure-',
      'update-',
      'mail-',
      'notice-',
    ];
    const hasBrandPrefix = brandPrefixes.some((bp) => lowerInput.includes(bp));
    const hasSuspiciousDomain = suspiciousEmailDomains.some((sd) => lowerInput.includes(sd));
    if (hasBrandPrefix && hasSuspiciousDomain) {
      triggerRule(
        'EMAIL-DISPLAY-DOMAIN-SPOOF',
        `Authoritative sender prefix paired with lookalike/external domain in "${rawInput.trim().slice(0, 80)}"`
      );
    }

    const localPart = rawInput.split('@')[0] || '';
    const digitCount = (localPart.match(/\d/g) || []).length;
    if (digitCount >= 4 || (localPart.match(/-/g) || []).length >= 3) {
      triggerRule(
        'EMAIL-HIGH-ENTROPY-LOCALPART',
        `High-entropy sender local-part "${localPart}" (${digitCount} numeric digits)`
      );
    }
  }

  // 6. Evaluate Phone Rules
  if (inputType === 'PHONE' || extractedIndicators.some((i) => i.type === 'PHONE')) {
    const suspiciousPhonePrefixes = [
      '+155501',
      '+1-555-01',
      '+447700900',
      '+44-7700-900',
      '+91999900',
      '+91-99990-0',
      '+234',
      '+855',
      '+92',
      '1800-000-',
    ];
    const matchedPrefix = suspiciousPhonePrefixes.find(
      (p) => lowerInput.includes(p.toLowerCase()) || normalizedInput.startsWith(p.replace(/\D/g, ''))
    );
    if (matchedPrefix) {
      triggerRule(
        'PHONE-VIRTUAL-VOIP-PREFIX',
        `Matches flagged virtual VoIP / cross-border numbering block (${matchedPrefix})`
      );
    }

    if (/(\d)\1{4,}/.test(normalizedInput) || /0000|9999|12345/.test(normalizedInput)) {
      triggerRule(
        'PHONE-REPEATED-REPORT-CLUSTER',
        `Burner/sequential digit allocation pattern in "${rawInput.trim()}"`
      );
    }
  }

  // 7. Evaluate Transaction Reference Rules
  if (inputType === 'TRANSACTION' || extractedIndicators.some((i) => i.type === 'TRANSACTION')) {
    const mulePrefixes = [
      'UTR-MULE',
      'TXN-FRD',
      'REV-COLLECT',
      'WIRE-URG',
      'CRYPTO-BRIDGE',
      'UPI-PULL',
      'ESCROW-HOLD',
    ];
    const matchedTxnPrefix = mulePrefixes.find((p) =>
      rawInput.toUpperCase().includes(p)
    );
    if (matchedTxnPrefix) {
      triggerRule(
        'TXN-RAPID-MULE-SETTLEMENT',
        `Transaction reference contains flagged corridor prefix "${matchedTxnPrefix}"`
      );
    }

    const memoKeywords = [
      'escrow',
      'unlock-fee',
      'tax-clearance',
      'refundable-deposit',
      'security-bond',
      'customs-release',
      'vip-task',
    ];
    const matchedMemo = memoKeywords.filter((k) => lowerInput.includes(k));
    if (matchedMemo.length > 0) {
      triggerRule(
        'TXN-UNVERIFIED-MERCHANT-MEMO',
        `Suspicious transaction descriptor keyword(s): "${matchedMemo.join('", "')}"`
      );
    }
  }

  // Calculate reproducible, transparent Risk Score (0 - 100)
  const baseScore = 0;
  const rawRuleSum = triggeredFactors.reduce((acc, f) => acc + f.scoreContribution, 0);
  const corroborationMultiplier =
    triggeredFactors.length >= 4
      ? 1.15
      : triggeredFactors.length >= 2
      ? 1.05
      : 1.0;

  const unCapped = Math.round((baseScore + rawRuleSum + threatIntelBonus) * corroborationMultiplier);
  const riskScore = Math.max(0, Math.min(100, unCapped));
  const riskLevel: RiskLevel = getRiskLevelFromScore(riskScore);

  // Heuristic Confidence reflects how much structural telemetry was available to evaluate
  const heuristicConfidence = Math.min(
    98,
    Math.max(
      62,
      70 +
        triggeredFactors.length * 6 +
        (extractedIndicators.some((i) => i.matchedInDatabase) ? 12 : 0)
    )
  );

  const formulaDescription =
    triggeredFactors.length === 0
      ? 'Score = Base(0) + TriggeredRules(0) = 0 / 100 (No risk rules triggered)'
      : `Score = min(100, round((Base(${baseScore}) + RuleWeights(${rawRuleSum}) + IntelBonus(${threatIntelBonus})) × MultiSignalFactor(${corroborationMultiplier}))) = ${riskScore} / 100`;

  const verdictSummary =
    riskLevel === 'CRITICAL'
      ? `Critical Fraud Risk (${riskScore}/100): Multiple high-confidence scam signatures detected across ${triggeredFactors.length} explainable detection rule(s).`
      : riskLevel === 'HIGH'
      ? `High Fraud Risk (${riskScore}/100): Substantial suspicious indicators identified (${triggeredFactors.length} rule(s) triggered). Manual verification strongly advised.`
      : riskLevel === 'MEDIUM'
      ? `Moderate Risk (${riskScore}/100): Anomalous characteristics detected (${triggeredFactors.length} rule(s) triggered). Caution and out-of-band verification recommended.`
      : triggeredFactors.length > 0
      ? `Low Risk (${riskScore}/100): Minor heuristic signal detected (${triggeredFactors.length} rule triggered), below high-risk threshold.`
      : `Low Risk (0/100): No known scam signatures or synthetic threat intelligence matches were triggered by the submitted ${inputType.toLowerCase()}.`;

  const detailedExplanation =
    triggeredFactors.length === 0
      ? `The ScamTrace Explainable Engine evaluated ${activeRules.length} active detection rules and cross-referenced the normalized ${inputType} against the synthetic threat intelligence repository. No known typosquatting, credential harvesting, coercive urgency, or fraudulent payment patterns were detected.`
      : `The ScamTrace Explainable Engine evaluated ${activeRules.length} active rules and triggered ${triggeredFactors.length} risk factor(s): ${triggeredFactors
          .map((f) => `${f.factorName} (+${f.scoreContribution} pts)`)
          .join('; ')}. Combined with ${
          threatIntelBonus > 0
            ? `a +${threatIntelBonus} pt threat intelligence corroboration bonus and `
            : ''
        }a ${corroborationMultiplier}x multi-signal corroboration multiplier, the composite risk score is ${riskScore}/100 (${riskLevel}).`;

  const recommendedActions: string[] = [];
  if (riskScore >= 75) {
    recommendedActions.push(
      'Do NOT click links, disclose OTP/PIN codes, or authorize any payment/collect request associated with this indicator.'
    );
    recommendedActions.push(
      'Escalate this analysis to an active Investigation Case and preserve raw headers/screenshots in the Evidence Vault.'
    );
    recommendedActions.push(
      'Verify any purported institutional claim exclusively via an independently trusted official phone number or domain.'
    );
  } else if (riskScore >= 50) {
    recommendedActions.push(
      'Perform out-of-band verification with the purported sender or organization before acting on the request.'
    );
    recommendedActions.push(
      'Cross-reference extracted indicators in the ScamTrace Entity Relationship Network to check for linked reports.'
    );
  } else if (riskScore >= 25) {
    recommendedActions.push(
      'Inspect sender domain and payment handle carefully for subtle character substitutions.'
    );
    recommendedActions.push(
      'Monitor indicator for repeat submissions before approving any sensitive transaction.'
    );
  } else {
    recommendedActions.push(
      'Continue standard security hygiene; absence of triggered rules does not guarantee a sender is legitimate.'
    );
  }

  const limitations: string[] = [
    'Rule-Based Heuristic Demonstration: This assessment is generated by a deterministic, explainable rule engine and synthetic threat intelligence corpus—not a live external reputation feed.',
    'Static Local Inspection Only: ScamTrace safely analyzes URLs and messages as untrusted text without visiting live websites, executing scripts, or querying external WHOIS/DNS servers.',
    'Not Legal Proof of Criminal Activity: A high risk score indicates structural similarity to known scam patterns and must be corroborated by human investigators before formal attribution.',
  ];

  let savedId: string | undefined;
  const createdAt = new Date();

  if (saveToDatabase) {
    try {
      const analysisId = `ANL-2026-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;
      const saved = await prisma.analysisResult.create({
        data: {
          id: analysisId,
          inputType,
          rawInput,
          normalizedInput,
          riskScore,
          riskLevel,
          heuristicConfidence,
          verdictSummary,
          detailedExplanation,
          extractedIndicatorsJson: JSON.stringify(extractedIndicators),
          recommendedActionsJson: JSON.stringify(recommendedActions),
          limitationsJson: JSON.stringify(limitations),
          userId: userId || null,
          factors: {
            create: triggeredFactors.map((f) => ({
              ruleId: f.ruleId && f.ruleId.startsWith('RULE-') ? f.ruleId : null,
              ruleCode: f.ruleCode,
              factorName: f.factorName,
              category: f.category,
              severity: f.severity,
              scoreContribution: f.scoreContribution,
              matchedEvidence: f.matchedEvidence,
              explanation: f.explanation,
            })),
          },
        },
      });
      savedId = saved.id;

      // Update match counts for triggered rules
      for (const f of triggeredFactors) {
        await prisma.detectionRule
          .updateMany({
            where: { code: f.ruleCode },
            data: {
              matchCount: { increment: 1 },
              lastTriggeredAt: createdAt,
            },
          })
          .catch(() => undefined);
      }

      // Create high-risk alert if score >= 75
      if (riskScore >= 75) {
        await prisma.alert
          .create({
            data: {
              id: `ALT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
              title: `Critical Scam Analysis Triggered (${riskScore}/100)`,
              message: `${inputType} analysis matched ${triggeredFactors.length} detection rules: "${rawInput.slice(0, 70)}"`,
              category: 'HIGH_RISK_ANALYSIS',
              severity: 'CRITICAL',
              isRead: false,
              actionUrl: '/app/analyze',
              relatedEntityId: savedId,
              userId: userId || null,
            },
          })
          .catch(() => undefined);
      }
    } catch {
      // Allow analysis engine to return result even in read-only or mock environments
    }
  }

  return {
    id: savedId,
    inputType,
    rawInput,
    normalizedInput,
    riskScore,
    riskLevel,
    heuristicConfidence,
    verdictSummary,
    detailedExplanation,
    triggeredFactors,
    extractedIndicators,
    recommendedActions,
    limitations,
    scoreCalculationBreakdown: {
      baseScore,
      rawRuleSum,
      threatIntelBonus,
      corroborationMultiplier,
      cappedFinalScore: riskScore,
      formulaDescription,
    },
    engineVersion: 'ScamTrace Explainable Engine v2.4 (Rule-Based)',
    evaluatedRulesCount: activeRules.length,
    createdAt: createdAt.toISOString(),
  };
}

