import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/db';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  canPerformAction,
  hasRequiredRole,
  SignupSchema,
} from '@/lib/auth';
import {
  AnalyzeInputSchema,
  normalizeIndicatorInput,
  runExplainableAnalysis,
} from '@/services/analysis-engine';
import { verifyDatasetCounts } from '../scripts/verify-dataset';
import { getRiskLevelFromScore, toCsvContent } from '@/lib/utils';

describe('ScamTrace Comprehensive Verification & Security Suite', () => {
  // 1. Registration Validation & Password Hashing
  it('1. validates user registration input and hashes passwords securely', async () => {
    const validPayload = {
      fullName: 'Test Forensic Analyst',
      email: 'analyst.unit@scamtrace.example',
      password: 'SecurePassword2026',
      confirmPassword: 'SecurePassword2026',
      acceptTerms: true as const,
      role: 'INVESTIGATOR' as const,
    };

    const parsed = SignupSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);

    const mismatch = SignupSchema.safeParse({
      ...validPayload,
      confirmPassword: 'DifferentPassword123',
    });
    expect(mismatch.success).toBe(false);

    const hash = await hashPassword(validPayload.password);
    expect(hash).not.toBe(validPayload.password);
    expect(hash.startsWith('$2')).toBe(true);
  });

  // 2. Login & Session Token Verification
  it('2. authenticates demo credentials and issues verifiable signed JWT session tokens', async () => {
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@scamtrace.example' },
    });
    expect(adminUser).not.toBeNull();

    const isPasswordValid = await verifyPassword(
      'ScamTrace@Admin2026',
      adminUser!.passwordHash
    );
    expect(isPasswordValid).toBe(true);

    const invalidCheck = await verifyPassword(
      'WrongPassword999',
      adminUser!.passwordHash
    );
    expect(invalidCheck).toBe(false);

    const token = await createSessionToken({
      id: adminUser!.id,
      email: adminUser!.email,
      fullName: adminUser!.fullName,
      role: 'ADMINISTRATOR',
      department: adminUser!.department,
      avatarColor: adminUser!.avatarColor,
    });

    const verifiedSession = await verifySessionToken(token);
    expect(verifiedSession).not.toBeNull();
    expect(verifiedSession?.email).toBe('admin@scamtrace.example');
    expect(verifiedSession?.role).toBe('ADMINISTRATOR');
  });

  // 3. Unauthorized Route Protection
  it('3. rejects forged, malformed, or missing session tokens for protected routes', async () => {
    const emptyResult = await verifySessionToken('');
    expect(emptyResult).toBeNull();

    const tamperedResult = await verifySessionToken(
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdHRhY2tlciJ9.invalid_signature'
    );
    expect(tamperedResult).toBeNull();
  });

  // 4. Role-Based Authorization (RBAC)
  it('4. enforces strict role hierarchy across Administrator, Investigator, and Viewer roles', () => {
    expect(hasRequiredRole('ADMINISTRATOR', 'ADMINISTRATOR')).toBe(true);
    expect(hasRequiredRole('INVESTIGATOR', 'ADMINISTRATOR')).toBe(false);
    expect(hasRequiredRole('VIEWER', 'INVESTIGATOR')).toBe(false);

    // Viewer can view & run sandboxed analysis, but cannot create/modify/export/manage rules
    expect(canPerformAction('VIEWER', 'VIEW_PLATFORM')).toBe(true);
    expect(canPerformAction('VIEWER', 'RUN_ANALYSIS')).toBe(true);
    expect(canPerformAction('VIEWER', 'CREATE_REPORT')).toBe(false);
    expect(canPerformAction('VIEWER', 'CREATE_CASE')).toBe(false);
    expect(canPerformAction('VIEWER', 'EXPORT_DATA')).toBe(false);
    expect(canPerformAction('VIEWER', 'MANAGE_RULES')).toBe(false);

    // Investigator can create reports, cases, evidence, and export, but cannot manage rules/users
    expect(canPerformAction('INVESTIGATOR', 'CREATE_REPORT')).toBe(true);
    expect(canPerformAction('INVESTIGATOR', 'CREATE_CASE')).toBe(true);
    expect(canPerformAction('INVESTIGATOR', 'ADD_EVIDENCE')).toBe(true);
    expect(canPerformAction('INVESTIGATOR', 'EXPORT_DATA')).toBe(true);
    expect(canPerformAction('INVESTIGATOR', 'MANAGE_RULES')).toBe(false);
    expect(canPerformAction('INVESTIGATOR', 'MANAGE_USERS')).toBe(false);

    // Administrator can perform all actions
    expect(canPerformAction('ADMINISTRATOR', 'MANAGE_RULES')).toBe(true);
    expect(canPerformAction('ADMINISTRATOR', 'MANAGE_USERS')).toBe(true);
  });

  // 5. Scam Analysis Input Validation & Safe Normalization
  it('5. validates and normalizes scam analysis inputs safely without executing external requests', () => {
    const valid = AnalyzeInputSchema.safeParse({
      inputType: 'URL',
      rawInput: '  HTTPS://HDFC-KYC-UPDATE-0001.EXAMPLE/verify-kyc  ',
    });
    expect(valid.success).toBe(true);

    const tooShort = AnalyzeInputSchema.safeParse({
      inputType: 'URL',
      rawInput: 'ab',
    });
    expect(tooShort.success).toBe(false);

    expect(normalizeIndicatorInput('PHONE', '+1 (555) 010-001')).toBe(
      '+1555010001'
    );
    expect(normalizeIndicatorInput('UPI', '  Refund.Claim01@SandboxUPI ')).toBe(
      'refund.claim01@sandboxupi'
    );
  });

  // 6. Risk Scoring Calculations (0-100 & Tier Boundaries)
  it('6. calculates reproducible risk scores across Low, Medium, High, and Critical categories', async () => {
    expect(getRiskLevelFromScore(0)).toBe('LOW');
    expect(getRiskLevelFromScore(24)).toBe('LOW');
    expect(getRiskLevelFromScore(25)).toBe('MEDIUM');
    expect(getRiskLevelFromScore(49)).toBe('MEDIUM');
    expect(getRiskLevelFromScore(50)).toBe('HIGH');
    expect(getRiskLevelFromScore(74)).toBe('HIGH');
    expect(getRiskLevelFromScore(75)).toBe('CRITICAL');
    expect(getRiskLevelFromScore(100)).toBe('CRITICAL');

    const benignAnalysis = await runExplainableAnalysis({
      inputType: 'URL',
      rawInput: 'https://library.university.edu/catalog',
      saveToDatabase: false,
    });
    expect(benignAnalysis.riskScore).toBeLessThan(25);
    expect(benignAnalysis.riskLevel).toBe('LOW');

    const criticalAnalysis = await runExplainableAnalysis({
      inputType: 'MESSAGE',
      rawInput:
        'FINAL NOTICE: Your account will be blocked within 24 hours. Enter your OTP and UPI PIN immediately at http://hdfc-kyc-update-0001.example/verify-kyc/login or approve collect request refund.claim0001@sandboxupi',
      saveToDatabase: false,
    });
    expect(criticalAnalysis.riskScore).toBeGreaterThanOrEqual(75);
    expect(criticalAnalysis.riskLevel).toBe('CRITICAL');
  });

  // 7. Explanation Generation
  it('7. generates transparent explanations, triggered rule factors, verification steps, and limitations', async () => {
    const analysis = await runExplainableAnalysis({
      inputType: 'UPI',
      rawInput: 'refund.claim0001@sandboxupi',
      saveToDatabase: false,
    });

    expect(analysis.triggeredFactors.length).toBeGreaterThanOrEqual(2);
    expect(
      analysis.triggeredFactors.some(
        (f) => f.ruleCode === 'UPI-DECEPTIVE-COLLECT-HANDLE'
      )
    ).toBe(true);

    for (const factor of analysis.triggeredFactors) {
      expect(factor.factorName.length).toBeGreaterThan(3);
      expect(factor.scoreContribution).toBeGreaterThan(0);
      expect(factor.matchedEvidence.length).toBeGreaterThan(3);
      expect(factor.explanation.length).toBeGreaterThan(10);
    }

    expect(analysis.recommendedActions.length).toBeGreaterThan(0);
    expect(analysis.limitations.length).toBeGreaterThanOrEqual(3);
    expect(analysis.scoreCalculationBreakdown.formulaDescription).toContain(
      'Score ='
    );
  });

  // 8. Scam Report Creation & Persistence
  it('8. persists and retrieves scam reports with linked explainable risk telemetry', async () => {
    const sampleReport = await prisma.scamReport.findFirst({
      where: { reportNumber: 'RPT-2026-0001' },
      include: { indicator: true, investigationCase: true },
    });

    expect(sampleReport).not.toBeNull();
    expect(sampleReport?.riskScore).toBeGreaterThanOrEqual(0);
    expect(sampleReport?.detectionExplanation.length).toBeGreaterThan(15);
    expect(sampleReport?.indicator).not.toBeNull();
    expect(sampleReport?.investigationCase).not.toBeNull();
  });

  // 9. Investigation Case Management
  it('9. manages investigation cases with linked reports, indicators, evidence, and notes', async () => {
    const firstCase = await prisma.investigationCase.findFirst({
      where: { caseNumber: 'CASE-2026-0001' },
      include: {
        reports: true,
        indicators: true,
        evidence: true,
        notes: true,
      },
    });

    expect(firstCase).not.toBeNull();
    expect(firstCase!.reports.length).toBeGreaterThan(0);
    expect(firstCase!.indicators.length).toBeGreaterThan(0);
    expect(firstCase!.evidence.length).toBeGreaterThan(0);
    expect(firstCase!.notes.length).toBeGreaterThan(0);
  });

  // 10. Indicator Search & Filtering
  it('10. supports fast relational indicator search across URL, Domain, Phone, Email, and UPI types', async () => {
    const upiResults = await prisma.indicator.findMany({
      where: {
        type: 'UPI',
        value: { contains: 'refund.claim' },
      },
    });
    expect(upiResults.length).toBeGreaterThan(0);

    const phoneResults = await prisma.indicator.findMany({
      where: {
        type: 'PHONE',
      },
      take: 10,
    });
    expect(phoneResults.length).toBe(10);
  });

  // 11. Mandatory 1,500+ Dataset Count Verification
  it('11. verifies that at least 1,500 meaningful synthetic records and all 8 minimum table thresholds exist', async () => {
    const verification = await verifyDatasetCounts();

    expect(verification.passed).toBe(true);
    expect(verification.mandatoryCollections.scamReports.count).toBeGreaterThanOrEqual(300);
    expect(verification.mandatoryCollections.urlDomainIndicators.count).toBeGreaterThanOrEqual(300);
    expect(verification.mandatoryCollections.phoneIndicators.count).toBeGreaterThanOrEqual(200);
    expect(verification.mandatoryCollections.emailIndicators.count).toBeGreaterThanOrEqual(200);
    expect(verification.mandatoryCollections.messageSamples.count).toBeGreaterThanOrEqual(150);
    expect(verification.mandatoryCollections.transactionRecords.count).toBeGreaterThanOrEqual(150);
    expect(verification.mandatoryCollections.investigationCases.count).toBeGreaterThanOrEqual(100);
    expect(verification.mandatoryCollections.evidenceArtifacts.count).toBeGreaterThanOrEqual(100);
    expect(verification.mandatorySubtotal).toBeGreaterThanOrEqual(1500);
    expect(verification.grandTotalRecords).toBeGreaterThanOrEqual(1500);
  });

  // 12. CSV Export & Formula Injection Prevention
  it('12. generates valid RFC-4180 CSV exports and neutralizes spreadsheet formula injection', () => {
    const csv = toCsvContent(
      ['Report ID', 'Indicator', 'Risk Score'],
      [
        ['RPT-2026-0001', 'https://hdfc-kyc.example/login', 92],
        ['RPT-2026-0002', '=CMD|" /C calc"!A0', 85],
      ]
    );

    expect(csv).toContain('"Report ID","Indicator","Risk Score"');
    expect(csv).toContain('"RPT-2026-0001","https://hdfc-kyc.example/login","92"');
    // Formula starting with '=' must be prefixed with a single quote
    expect(csv).toContain('"\'=CMD|"" /C calc""!A0"');
  });
});

