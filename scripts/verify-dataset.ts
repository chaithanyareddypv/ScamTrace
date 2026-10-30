import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DatasetVerificationSummary {
  passed: boolean;
  mandatoryCollections: {
    scamReports: { count: number; minRequired: number; passed: boolean };
    urlDomainIndicators: { count: number; minRequired: number; passed: boolean };
    phoneIndicators: { count: number; minRequired: number; passed: boolean };
    emailIndicators: { count: number; minRequired: number; passed: boolean };
    messageSamples: { count: number; minRequired: number; passed: boolean };
    transactionRecords: { count: number; minRequired: number; passed: boolean };
    investigationCases: { count: number; minRequired: number; passed: boolean };
    evidenceArtifacts: { count: number; minRequired: number; passed: boolean };
  };
  additionalCollections: {
    upiAndOtherIndicators: number;
    detectionRules: number;
    threatPatterns: number;
    entityRelationships: number;
    analysisResults: number;
    detectionFactors: number;
    caseNotes: number;
    alerts: number;
    auditLogs: number;
    users: number;
  };
  mandatorySubtotal: number;
  grandTotalRecords: number;
}

export async function verifyDatasetCounts(): Promise<DatasetVerificationSummary> {
  const [
    scamReports,
    urlDomainIndicators,
    phoneIndicators,
    emailIndicators,
    upiAndOtherIndicators,
    messageSamples,
    transactionRecords,
    investigationCases,
    evidenceArtifacts,
    detectionRules,
    threatPatterns,
    entityRelationships,
    analysisResults,
    detectionFactors,
    caseNotes,
    alerts,
    auditLogs,
    users,
  ] = await Promise.all([
    prisma.scamReport.count(),
    prisma.indicator.count({ where: { type: { in: ['URL', 'DOMAIN'] } } }),
    prisma.indicator.count({ where: { type: 'PHONE' } }),
    prisma.indicator.count({ where: { type: 'EMAIL' } }),
    prisma.indicator.count({
      where: { type: { notIn: ['URL', 'DOMAIN', 'PHONE', 'EMAIL'] } },
    }),
    prisma.messageSample.count(),
    prisma.transactionEvent.count(),
    prisma.investigationCase.count(),
    prisma.evidence.count(),
    prisma.detectionRule.count(),
    prisma.threatPattern.count(),
    prisma.entityRelationship.count(),
    prisma.analysisResult.count(),
    prisma.detectionFactor.count(),
    prisma.caseNote.count(),
    prisma.alert.count(),
    prisma.auditLog.count(),
    prisma.user.count(),
  ]);

  const mandatoryCollections = {
    scamReports: {
      count: scamReports,
      minRequired: 300,
      passed: scamReports >= 300,
    },
    urlDomainIndicators: {
      count: urlDomainIndicators,
      minRequired: 300,
      passed: urlDomainIndicators >= 300,
    },
    phoneIndicators: {
      count: phoneIndicators,
      minRequired: 200,
      passed: phoneIndicators >= 200,
    },
    emailIndicators: {
      count: emailIndicators,
      minRequired: 200,
      passed: emailIndicators >= 200,
    },
    messageSamples: {
      count: messageSamples,
      minRequired: 150,
      passed: messageSamples >= 150,
    },
    transactionRecords: {
      count: transactionRecords,
      minRequired: 150,
      passed: transactionRecords >= 150,
    },
    investigationCases: {
      count: investigationCases,
      minRequired: 100,
      passed: investigationCases >= 100,
    },
    evidenceArtifacts: {
      count: evidenceArtifacts,
      minRequired: 100,
      passed: evidenceArtifacts >= 100,
    },
  };

  const mandatorySubtotal =
    scamReports +
    urlDomainIndicators +
    phoneIndicators +
    emailIndicators +
    messageSamples +
    transactionRecords +
    investigationCases +
    evidenceArtifacts;

  const grandTotalRecords =
    mandatorySubtotal +
    upiAndOtherIndicators +
    detectionRules +
    threatPatterns +
    entityRelationships +
    analysisResults +
    detectionFactors +
    caseNotes +
    alerts +
    auditLogs +
    users;

  const allCategoriesPassed = Object.values(mandatoryCollections).every(
    (c) => c.passed
  );
  const passed = allCategoriesPassed && mandatorySubtotal >= 1500 && grandTotalRecords >= 1500;

  return {
    passed,
    mandatoryCollections,
    additionalCollections: {
      upiAndOtherIndicators,
      detectionRules,
      threatPatterns,
      entityRelationships,
      analysisResults,
      detectionFactors,
      caseNotes,
      alerts,
      auditLogs,
      users,
    },
    mandatorySubtotal,
    grandTotalRecords,
  };
}

async function runCli() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ScamTrace Dataset Verification Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const summary = await verifyDatasetCounts();

  const rows = [
    ['Scam reports', summary.mandatoryCollections.scamReports.count, summary.mandatoryCollections.scamReports.minRequired, summary.mandatoryCollections.scamReports.passed ? 'PASS' : 'FAIL'],
    ['Suspicious URL/domain indicators', summary.mandatoryCollections.urlDomainIndicators.count, summary.mandatoryCollections.urlDomainIndicators.minRequired, summary.mandatoryCollections.urlDomainIndicators.passed ? 'PASS' : 'FAIL'],
    ['Suspicious phone indicators', summary.mandatoryCollections.phoneIndicators.count, summary.mandatoryCollections.phoneIndicators.minRequired, summary.mandatoryCollections.phoneIndicators.passed ? 'PASS' : 'FAIL'],
    ['Suspicious email indicators', summary.mandatoryCollections.emailIndicators.count, summary.mandatoryCollections.emailIndicators.minRequired, summary.mandatoryCollections.emailIndicators.passed ? 'PASS' : 'FAIL'],
    ['Suspicious message samples', summary.mandatoryCollections.messageSamples.count, summary.mandatoryCollections.messageSamples.minRequired, summary.mandatoryCollections.messageSamples.passed ? 'PASS' : 'FAIL'],
    ['Synthetic transaction records', summary.mandatoryCollections.transactionRecords.count, summary.mandatoryCollections.transactionRecords.minRequired, summary.mandatoryCollections.transactionRecords.passed ? 'PASS' : 'FAIL'],
    ['Investigation cases', summary.mandatoryCollections.investigationCases.count, summary.mandatoryCollections.investigationCases.minRequired, summary.mandatoryCollections.investigationCases.passed ? 'PASS' : 'FAIL'],
    ['Evidence artifacts', summary.mandatoryCollections.evidenceArtifacts.count, summary.mandatoryCollections.evidenceArtifacts.minRequired, summary.mandatoryCollections.evidenceArtifacts.passed ? 'PASS' : 'FAIL'],
  ];

  for (const [label, actual, min, status] of rows) {
    console.log(
      `  [${status}] ${String(label).padEnd(35)} : ${String(actual).padStart(5)} (Min: ${min})`
    );
  }

  console.log('────────────────────────────────────────────────────────────────────');
  console.log(`  Mandatory 8-Collection Subtotal         : ${summary.mandatorySubtotal} (Min: 1,500)`);
  console.log(`  AdditionalUPI/Rules/Graph/Audit Records : ${summary.grandTotalRecords - summary.mandatorySubtotal}`);
  console.log(`  GRAND TOTAL DATABASE RECORDS            : ${summary.grandTotalRecords}`);
  console.log('────────────────────────────────────────────────────────────────────');

  if (!summary.passed) {
    console.error('❌ Verification FAILED: Dataset does not meet the 1,500+ minimum requirement.');
    process.exit(1);
  }

  console.log('✅ Verification PASSED: All mandatory dataset counts and 1,500+ threshold satisfied!');
}

if (require.main === module || process.argv[1]?.includes('verify-dataset')) {
  runCli()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

