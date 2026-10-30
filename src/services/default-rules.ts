export interface RuleDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category:
    | 'URL_STRUCTURE'
    | 'DOMAIN_IMPERSONATION'
    | 'URGENCY_COERCION'
    | 'CREDENTIAL_HARVEST'
    | 'PAYMENT_ANOMALY'
    | 'SENDER_REPUTATION'
    | 'THREAT_INTEL_MATCH';
  targetTypes: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scoreWeight: number;
  maxWeight: number;
  isActive: boolean;
  matchCount: number;
  precisionEstimate: number;
  patternConfigJson: string;
  explanationTemplate: string;
}

export const DEFAULT_DETECTION_RULES: RuleDefinition[] = [
  {
    id: 'RULE-001',
    code: 'URL-TYPOSQUAT-BRAND',
    name: 'Brand Typosquatting & Lookalike Domain',
    description:
      'Detects domains that mimic trusted financial, payment, government, or logistics brands using hyphenated prefixes/suffixes or character substitutions.',
    category: 'DOMAIN_IMPERSONATION',
    targetTypes: 'URL,MESSAGE,EMAIL',
    severity: 'CRITICAL',
    scoreWeight: 34,
    maxWeight: 45,
    isActive: true,
    matchCount: 148,
    precisionEstimate: 0.94,
    patternConfigJson: JSON.stringify({
      brandTokens: [
        'paypa1',
        'pay-pal',
        'stripe-verify',
        'chase-secure',
        'hdfc-kyc',
        'sbi-online-update',
        'icici-alert',
        'amazon-parcel',
        'dhl-customs',
        'fedex-redelivery',
        'irs-refund',
        'gov-tax-portal',
        'appleid-unlock',
        'microsoft-auth',
        'binance-claim',
      ],
    }),
    explanationTemplate:
      'The domain contains lookalike brand tokens or hyphenated security keywords commonly registered by phishing kits to deceive visual inspection.',
  },
  {
    id: 'RULE-002',
    code: 'URL-SUSPICIOUS-TLD',
    name: 'High-Abuse Top-Level Domain or Deceptive Subdomain',
    description:
      'Flags URLs using disposable/high-risk TLD patterns or deeply nested deceptive subdomains (3+ subdomain levels).',
    category: 'URL_STRUCTURE',
    targetTypes: 'URL,MESSAGE',
    severity: 'MEDIUM',
    scoreWeight: 18,
    maxWeight: 35,
    isActive: true,
    matchCount: 192,
    precisionEstimate: 0.85,
    patternConfigJson: JSON.stringify({
      suspiciousTlds: ['.xyz', '.top', '.click', '.loan', '.work', '.zip', '.kim', '.gq', '.cf'],
      maxSubdomainDepth: 3,
    }),
    explanationTemplate:
      'The URL relies on a deeply nested subdomain hierarchy or high-abuse TLD construction designed to obscure the actual registrable domain.',
  },
  {
    id: 'RULE-003',
    code: 'URL-CREDENTIAL-PATH',
    name: 'Credential Harvesting Path & Query Signature',
    description:
      'Identifies URL paths and parameters targeting authentication tokens, KYC portals, wallet seeds, or session verification.',
    category: 'CREDENTIAL_HARVEST',
    targetTypes: 'URL,MESSAGE',
    severity: 'HIGH',
    scoreWeight: 24,
    maxWeight: 40,
    isActive: true,
    matchCount: 164,
    precisionEstimate: 0.91,
    patternConfigJson: JSON.stringify({
      pathTokens: [
        '/verify-kyc',
        '/login-secure',
        '/update-pan',
        '/account-unlock',
        '/claim-refund',
        '/validate-otp',
        '/wallet-connect',
        '/reset-pin',
        'token=',
        'session_verify=',
      ],
    }),
    explanationTemplate:
      'The URI path explicitly references credential verification, KYC renewal, or token validation endpoints associated with credential phishing.',
  },
  {
    id: 'RULE-004',
    code: 'URL-IP-OR-PUNYCODE',
    name: 'Raw IP Host, Punycode (xn--), or @-Credential Obfuscation',
    description:
      'Detects URLs hosted on raw IPv4 addresses, internationalized homograph punycode (xn--), or URL userinfo (@) redirection tricks.',
    category: 'URL_STRUCTURE',
    targetTypes: 'URL,MESSAGE',
    severity: 'CRITICAL',
    scoreWeight: 36,
    maxWeight: 45,
    isActive: true,
    matchCount: 67,
    precisionEstimate: 0.96,
    patternConfigJson: JSON.stringify({
      detectPunycode: true,
      detectIpHost: true,
      detectAtSymbolInAuthority: true,
    }),
    explanationTemplate:
      'The URL uses punycode homographs, raw IP addressing, or authority-section "@" obfuscation to bypass standard hostname checks.',
  },
  {
    id: 'RULE-005',
    code: 'URL-UNENCRYPTED-HTTP',
    name: 'Unencrypted HTTP Transport on Sensitive Action URL',
    description:
      'Flags cleartext HTTP links when combined with banking, login, or payment keywords.',
    category: 'URL_STRUCTURE',
    targetTypes: 'URL,MESSAGE',
    severity: 'MEDIUM',
    scoreWeight: 14,
    maxWeight: 25,
    isActive: true,
    matchCount: 89,
    precisionEstimate: 0.82,
    patternConfigJson: JSON.stringify({ protocol: 'http://' }),
    explanationTemplate:
      'The link uses unencrypted HTTP transport while soliciting sensitive user interaction.',
  },
  {
    id: 'RULE-006',
    code: 'MSG-URGENCY-COERCION',
    name: 'Artificial Urgency & Account Suspension Threat',
    description:
      'Detects coercive language threatening immediate account blockage, electricity disconnection, legal arrest, or expiring rewards within 24 hours.',
    category: 'URGENCY_COERCION',
    targetTypes: 'MESSAGE,EMAIL',
    severity: 'HIGH',
    scoreWeight: 26,
    maxWeight: 40,
    isActive: true,
    matchCount: 215,
    precisionEstimate: 0.90,
    patternConfigJson: JSON.stringify({
      phrases: [
        'immediately',
        'within 24 hours',
        'account will be blocked',
        'suspended today',
        'final notice',
        'urgent action required',
        'electricity will be disconnected',
        'warrant issued',
        'customs clearance pending',
        'avoid penalty',
      ],
    }),
    explanationTemplate:
      'The text employs psychological coercion and artificial time pressure to force action before the recipient can verify authenticity.',
  },
  {
    id: 'RULE-007',
    code: 'MSG-OTP-PIN-SOLICITATION',
    name: 'Direct Solicitation of OTP, PIN, CVV, or Password',
    description:
      'Flags messages or emails requesting One-Time Passwords (OTP), UPI PINs, card CVV codes, recovery phrases, or remote screen-sharing codes.',
    category: 'CREDENTIAL_HARVEST',
    targetTypes: 'MESSAGE,EMAIL',
    severity: 'CRITICAL',
    scoreWeight: 38,
    maxWeight: 45,
    isActive: true,
    matchCount: 134,
    precisionEstimate: 0.97,
    patternConfigJson: JSON.stringify({
      tokens: [
        'share otp',
        'enter your otp',
        'upi pin',
        'cvv',
        'seed phrase',
        'anydesk',
        'teamviewer',
        'verification code',
        'confirm your pin',
        'password',
      ],
    }),
    explanationTemplate:
      'Legitimate financial institutions and service providers never ask users to disclose OTPs, UPI PINs, CVVs, or remote-access codes.',
  },
  {
    id: 'RULE-008',
    code: 'MSG-FAKE-JOB-RECRUITMENT',
    name: 'Task-Based Recruitment & Advance-Fee Job Scam Pattern',
    description:
      'Detects fraudulent part-time remote job offers promising high daily commissions for simple ratings/reviews or requiring registration deposits.',
    category: 'PAYMENT_ANOMALY',
    targetTypes: 'MESSAGE,EMAIL',
    severity: 'HIGH',
    scoreWeight: 28,
    maxWeight: 40,
    isActive: true,
    matchCount: 96,
    precisionEstimate: 0.92,
    patternConfigJson: JSON.stringify({
      phrases: [
        'earn $',
        'per day working from home',
        'rate google maps',
        'like youtube videos',
        'prepaid task',
        'registration fee',
        'vip task group',
        'telegram receptionist',
        'no experience needed',
      ],
    }),
    explanationTemplate:
      'Matches known task-scam and advance-fee recruitment scripts that lure victims with micro-commissions before demanding prepaid deposits.',
  },
  {
    id: 'RULE-009',
    code: 'MSG-DELIVERY-CUSTOMS-SCAM',
    name: 'Deceptive Parcel Redelivery & Customs Fee Lure',
    description:
      'Identifies fake logistics notifications claiming an undeliverable package due to incomplete address or small unpaid customs duty.',
    category: 'DOMAIN_IMPERSONATION',
    targetTypes: 'MESSAGE,EMAIL,URL',
    severity: 'HIGH',
    scoreWeight: 25,
    maxWeight: 35,
    isActive: true,
    matchCount: 112,
    precisionEstimate: 0.89,
    patternConfigJson: JSON.stringify({
      phrases: [
        'package could not be delivered',
        'incomplete address',
        'pay redelivery fee',
        'customs duty pending',
        'warehouse return',
        'update delivery preference',
        'shipment on hold',
      ],
    }),
    explanationTemplate:
      'Exhibits the classic parcel-interception lure designed to harvest payment card details under the guise of a nominal redelivery fee.',
  },
  {
    id: 'RULE-010',
    code: 'MSG-INVESTMENT-GUARANTEED-RETURN',
    name: 'Unrealistic Guaranteed Investment & Crypto Doubling Return',
    description:
      'Detects fraudulent investment promotions promising risk-free guaranteed returns, insider trading signals, or instant crypto multiplier payouts.',
    category: 'PAYMENT_ANOMALY',
    targetTypes: 'MESSAGE,EMAIL,URL',
    severity: 'HIGH',
    scoreWeight: 30,
    maxWeight: 40,
    isActive: true,
    matchCount: 84,
    precisionEstimate: 0.93,
    patternConfigJson: JSON.stringify({
      phrases: [
        'guaranteed return',
        '200% profit',
        'risk-free trading',
        'institutional quant group',
        'double your crypto',
        'guaranteed daily roi',
        'insider stock signal',
      ],
    }),
    explanationTemplate:
      'Promises of guaranteed high-yield returns with zero risk are a primary hallmark of pig-butchering and unlicensed investment fraud.',
  },
  {
    id: 'RULE-011',
    code: 'UPI-DECEPTIVE-COLLECT-HANDLE',
    name: 'Deceptive UPI Handle Impersonating Refund/Merchant Desk',
    description:
      'Flags UPI VPA identifiers containing misleading keywords like "refund", "cashback", "kyc", "helpline", "verify", or "gov" used in collect-request scams.',
    category: 'PAYMENT_ANOMALY',
    targetTypes: 'UPI,MESSAGE,TRANSACTION',
    severity: 'CRITICAL',
    scoreWeight: 36,
    maxWeight: 45,
    isActive: true,
    matchCount: 141,
    precisionEstimate: 0.95,
    patternConfigJson: JSON.stringify({
      suspiciousHandleTokens: [
        'refund',
        'cashback',
        'kycdesk',
        'care.help',
        'customercare',
        'pmcare-claim',
        'taxrefund',
        'lottery',
        'rewardclaim',
        'verifyaccount',
        'unblock',
      ],
    }),
    explanationTemplate:
      'The UPI Virtual Payment Address (VPA) embeds refund or customer-support terminology to trick users into authorizing an outgoing debit ("Collect Request") believing they are receiving funds.',
  },
  {
    id: 'RULE-012',
    code: 'UPI-UNRECOGNIZED-PSP-FORMAT',
    name: 'Malformed or High-Risk Synthetic PSP Handle Suffix',
    description:
      'Checks UPI VPA structure (`handle@psp`) for invalid syntax, numeric-heavy disposable prefixes, or untrusted synthetic PSP suffixes.',
    category: 'SENDER_REPUTATION',
    targetTypes: 'UPI',
    severity: 'MEDIUM',
    scoreWeight: 20,
    maxWeight: 35,
    isActive: true,
    matchCount: 78,
    precisionEstimate: 0.86,
    patternConfigJson: JSON.stringify({
      suspiciousSuffixes: ['@tempbank', '@fastpaytest', '@anonwallet', '@sandboxupi', '@fakepsp'],
    }),
    explanationTemplate:
      'The UPI identifier uses a non-standard PSP suffix or randomly generated numeric handle commonly observed in mule VPA rotation.',
  },
  {
    id: 'RULE-013',
    code: 'EMAIL-DISPLAY-DOMAIN-SPOOF',
    name: 'Email Free-Webmail Brand Impersonation or Spoofed Pattern',
    description:
      'Detects email addresses where corporate/government brand names are paired with disposable or consumer domains, or synthetic lookalike domains.',
    category: 'SENDER_REPUTATION',
    targetTypes: 'EMAIL,MESSAGE',
    severity: 'HIGH',
    scoreWeight: 28,
    maxWeight: 40,
    isActive: true,
    matchCount: 156,
    precisionEstimate: 0.91,
    patternConfigJson: JSON.stringify({
      brandPrefixes: ['support', 'security', 'billing', 'kyc', 'fraud-team', 'compliance', 'ceo-office', 'payroll'],
      disposableOrSuspiciousDomains: [
        'mail-verify.example',
        'secure-notice.test',
        'alert-desk.example',
        'tempmail.example',
        'auth-update.test',
      ],
    }),
    explanationTemplate:
      'The sender address pairs an authoritative role/brand local-part with an external or lookalike domain not owned by the purported institution.',
  },
  {
    id: 'RULE-014',
    code: 'EMAIL-HIGH-ENTROPY-LOCALPART',
    name: 'Automated Bulk-Mailer High-Entropy Local-Part',
    description:
      'Identifies machine-generated sender local-parts with excessive digits, hyphens, or random character sequences.',
    category: 'SENDER_REPUTATION',
    targetTypes: 'EMAIL',
    severity: 'MEDIUM',
    scoreWeight: 16,
    maxWeight: 30,
    isActive: true,
    matchCount: 93,
    precisionEstimate: 0.83,
    patternConfigJson: JSON.stringify({ digitThreshold: 4 }),
    explanationTemplate:
      'The email local-part contains high-entropy numeric/character sequences typical of rotatable bulk phishing accounts.',
  },
  {
    id: 'RULE-015',
    code: 'PHONE-VIRTUAL-VOIP-PREFIX',
    name: 'Known Virtual VoIP / Disposable Number Range Pattern',
    description:
      'Flags phone numbers matching synthetic VoIP ranges, premium-rate callback prefixes, or international spoofed country codes.',
    category: 'SENDER_REPUTATION',
    targetTypes: 'PHONE,MESSAGE',
    severity: 'HIGH',
    scoreWeight: 26,
    maxWeight: 38,
    isActive: true,
    matchCount: 129,
    precisionEstimate: 0.88,
    patternConfigJson: JSON.stringify({
      suspiciousPrefixes: ['+1-555-01', '+44-7700-900', '+91-99990-0', '+234-', '+855-', '+92-'],
    }),
    explanationTemplate:
      'The phone indicator originates from a virtual VoIP block or cross-border numbering prefix frequently associated with mass vishing and SMS lure campaigns.',
  },
  {
    id: 'RULE-016',
    code: 'PHONE-REPEATED-REPORT-CLUSTER',
    name: 'Sequential / Burner Number Pattern',
    description:
      'Detects numbers exhibiting sequential burner allocation or abnormal toll-free impersonation formatting.',
    category: 'SENDER_REPUTATION',
    targetTypes: 'PHONE',
    severity: 'MEDIUM',
    scoreWeight: 18,
    maxWeight: 30,
    isActive: true,
    matchCount: 74,
    precisionEstimate: 0.84,
    patternConfigJson: JSON.stringify({ checkRepeatingDigits: true }),
    explanationTemplate:
      'The phone number matches synthetic burner allocation heuristics or spoofed helpline numbering.',
  },
  {
    id: 'RULE-017',
    code: 'TXN-RAPID-MULE-SETTLEMENT',
    name: 'High-Velocity Mule Account Reference & Split Structuring',
    description:
      'Flags transaction references exhibiting structuring amounts (just below reporting thresholds), instant P2P cashout markers, or mule corridor tags.',
    category: 'PAYMENT_ANOMALY',
    targetTypes: 'TRANSACTION,MESSAGE',
    severity: 'HIGH',
    scoreWeight: 30,
    maxWeight: 42,
    isActive: true,
    matchCount: 108,
    precisionEstimate: 0.91,
    patternConfigJson: JSON.stringify({
      suspiciousPrefixes: ['UTR-MULE', 'TXN-FRD', 'REV-COLLECT', 'WIRE-URG', 'CRYPTO-BRIDGE', 'UPI-PULL'],
    }),
    explanationTemplate:
      'The transaction reference matches high-risk settlement patterns, unauthorized pull-request markers, or rapid mule dispersion corridors.',
  },
  {
    id: 'RULE-018',
    code: 'TXN-UNVERIFIED-MERCHANT-MEMO',
    name: 'Suspicious Payment Memo / Reference Descriptor',
    description:
      'Detects transaction strings containing coercive memos, fake escrow markers, or reversible-refund descriptors.',
    category: 'PAYMENT_ANOMALY',
    targetTypes: 'TRANSACTION',
    severity: 'MEDIUM',
    scoreWeight: 20,
    maxWeight: 32,
    isActive: true,
    matchCount: 65,
    precisionEstimate: 0.86,
    patternConfigJson: JSON.stringify({
      keywords: ['escrow', 'unlock-fee', 'tax-clearance', 'refundable-deposit', 'security-bond'],
    }),
    explanationTemplate:
      'The transaction metadata includes advance-fee or fake-escrow terminology commonly used to justify upfront victim payments.',
  },
  {
    id: 'RULE-019',
    code: 'INTEL-CORPUS-EXACT-MATCH',
    name: 'Direct Match in ScamTrace Synthetic Threat Intelligence Corpus',
    description:
      'Triggers when the normalized indicator or an extracted entity directly matches a known record in the ScamTrace Indicator database.',
    category: 'THREAT_INTEL_MATCH',
    targetTypes: 'URL,EMAIL,PHONE,MESSAGE,UPI,TRANSACTION',
    severity: 'CRITICAL',
    scoreWeight: 40,
    maxWeight: 45,
    isActive: true,
    matchCount: 245,
    precisionEstimate: 0.98,
    patternConfigJson: JSON.stringify({ lookupDatabase: true }),
    explanationTemplate:
      'This exact indicator is cataloged in the ScamTrace Threat Intelligence repository and linked to prior scam reports or active investigations.',
  },
  {
    id: 'RULE-020',
    code: 'INTEL-CAMPAIGN-INFRASTRUCTURE',
    name: 'Shared Infrastructure / Domain Cluster Correlation',
    description:
      'Detects indicators sharing a base domain, sender stem, or payment handle with known multi-report scam campaigns.',
    category: 'THREAT_INTEL_MATCH',
    targetTypes: 'URL,EMAIL,UPI,MESSAGE',
    severity: 'HIGH',
    scoreWeight: 26,
    maxWeight: 40,
    isActive: true,
    matchCount: 118,
    precisionEstimate: 0.92,
    patternConfigJson: JSON.stringify({ correlationType: 'domain_or_handle_stem' }),
    explanationTemplate:
      'The indicator shares structural infrastructure (domain stem or VPA prefix) with a tracked scam campaign cluster.',
  },
  {
    id: 'RULE-021',
    code: 'MSG-IMPERSONATION-AUTHORITY',
    name: 'Government, Law Enforcement, or Executive Impersonation',
    description:
      'Flags communications claiming to originate from tax agencies, cybercrime police, customs officials, or company CEOs demanding confidential action.',
    category: 'DOMAIN_IMPERSONATION',
    targetTypes: 'MESSAGE,EMAIL',
    severity: 'HIGH',
    scoreWeight: 27,
    maxWeight: 38,
    isActive: true,
    matchCount: 88,
    precisionEstimate: 0.90,
    patternConfigJson: JSON.stringify({
      authorityTokens: [
        'cyber crime department',
        'income tax department',
        'customs officer',
        'reserve bank notice',
        'federal执法',
        'ceo urgent request',
        'gift cards for client',
        'digital arrest',
      ],
    }),
    explanationTemplate:
      'The message impersonates regulatory, law enforcement, or executive authority to intimidate the recipient into compliance.',
  },
  {
    id: 'RULE-022',
    code: 'URL-EXCESSIVE-LENGTH-OBFUSCATION',
    name: 'Abnormal URL Length & Encoded Parameter Obfuscation',
    description:
      'Flags unusually long URLs (>95 characters) or heavy percent-encoding/base64 redirect chains used to hide destination hosts on mobile screens.',
    category: 'URL_STRUCTURE',
    targetTypes: 'URL,MESSAGE',
    severity: 'MEDIUM',
    scoreWeight: 15,
    maxWeight: 28,
    isActive: true,
    matchCount: 104,
    precisionEstimate: 0.81,
    patternConfigJson: JSON.stringify({ lengthThreshold: 95 }),
    explanationTemplate:
      'The URL exceeds normal length thresholds or embeds encoded redirection parameters that conceal the destination hostname on mobile devices.',
  },
  {
    id: 'RULE-023',
    code: 'MSG-TECH-SUPPORT-CALLBACK',
    name: 'Fake Security Alert & Toll-Free Callback Lure',
    description:
      'Identifies fake antivirus/firewall invoice alerts or browser lock messages instructing the user to call a support number immediately.',
    category: 'URGENCY_COERCION',
    targetTypes: 'MESSAGE,EMAIL',
    severity: 'HIGH',
    scoreWeight: 26,
    maxWeight: 38,
    isActive: true,
    matchCount: 62,
    precisionEstimate: 0.91,
    patternConfigJson: JSON.stringify({
      phrases: [
        'auto-renewal invoice',
        'norton',
        'mcafee',
        'geek squad',
        'windows defender alert',
        'call support immediately to cancel',
        'trojan detected',
      ],
    }),
    explanationTemplate:
      'Matches tech-support refund scam templates designed to induce panic over a fabricated subscription charge and route victims to a call center.',
  },
  {
    id: 'RULE-024',
    code: 'PAYMENT-QR-REVERSE-TRAP',
    name: 'Deceptive QR Code / Collect Approval Instruction',
    description:
      'Detects instructions telling a seller or recipient to scan a QR code or enter a UPI PIN in order to "receive" money.',
    category: 'PAYMENT_ANOMALY',
    targetTypes: 'MESSAGE,UPI,TRANSACTION',
    severity: 'CRITICAL',
    scoreWeight: 38,
    maxWeight: 45,
    isActive: true,
    matchCount: 91,
    precisionEstimate: 0.97,
    patternConfigJson: JSON.stringify({
      phrases: [
        'scan qr to receive',
        'enter pin to receive',
        'approve collect request to get refund',
        'scan and enter mpin',
      ],
    }),
    explanationTemplate:
      'Scanning a QR code or entering a UPI MPIN is never required to receive money; this is a definitive social-engineering tactic for unauthorized debit.',
  },
];

