import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { formatCategoryLabel } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '60d';
  const categoryFilter = searchParams.get('category') || 'ALL';

  const days =
    timeRange === '7d'
      ? 7
      : timeRange === '14d'
      ? 14
      : timeRange === '30d'
      ? 30
      : 60;

  const referenceNow = new Date('2026-10-30T23:59:59.000Z');
  const sinceDate = new Date(referenceNow.getTime() - days * 24 * 3600 * 1000);

  const reportWhere: Record<string, unknown> = {
    createdAt: { gte: sinceDate },
  };
  if (categoryFilter !== 'ALL') {
    reportWhere.category = categoryFilter;
  }

  const [
    totalScamReports,
    totalIndicators,
    highRiskInvestigations,
    activeCases,
    resolvedCases,
    pendingReviews,
    filteredReports,
    allCases,
    threatPatterns,
    recentReports,
    recentIndicators,
    highPriorityCases,
    recentEvidence,
    detectionRules,
    urlDomainCount,
    phoneCount,
    emailCount,
    upiOtherCount,
    messageSamplesCount,
    transactionsCount,
    casesTotalCount,
    evidenceTotalCount,
    relationshipsCount,
  ] = await Promise.all([
    prisma.scamReport.count(),
    prisma.indicator.count(),
    prisma.investigationCase.count({
      where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } },
    }),
    prisma.investigationCase.count({
      where: { status: { in: ['NEW', 'UNDER_INVESTIGATION'] } },
    }),
    prisma.investigationCase.count({
      where: { status: { in: ['RESOLVED', 'CLOSED'] } },
    }),
    prisma.investigationCase.count({
      where: { status: 'PENDING_REVIEW' },
    }),
    prisma.scamReport.findMany({
      where: reportWhere,
      select: {
        id: true,
        category: true,
        riskLevel: true,
        riskScore: true,
        status: true,
        financialLossAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.investigationCase.findMany({
      select: {
        id: true,
        status: true,
        riskLevel: true,
        priority: true,
        category: true,
      },
    }),
    prisma.threatPattern.findMany({
      orderBy: { detectionCount: 'desc' },
    }),
    prisma.scamReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 7,
      include: {
        investigationCase: { select: { id: true, caseNumber: true } },
      },
    }),
    prisma.indicator.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: 7,
    }),
    prisma.investigationCase.findMany({
      where: { priority: { in: ['CRITICAL', 'HIGH'] } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include: {
        assignedTo: { select: { fullName: true, role: true } },
      },
    }),
    prisma.evidence.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        investigationCase: { select: { id: true, caseNumber: true } },
      },
    }),
    prisma.detectionRule.findMany({
      orderBy: { matchCount: 'desc' },
      take: 10,
    }),
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
    prisma.entityRelationship.count(),
  ]);

  // 1. Build Daily/Weekly Scam Activity Over Time
  const bucketMap = new Map<
    string,
    { date: string; reports: number; critical: number; high: number; avgScore: number; scoreSum: number }
  >();

  for (const r of filteredReports) {
    const dStr = r.createdAt.toISOString().slice(0, 10);
    const cur = bucketMap.get(dStr) || {
      date: dStr,
      reports: 0,
      critical: 0,
      high: 0,
      avgScore: 0,
      scoreSum: 0,
    };
    cur.reports += 1;
    if (r.riskLevel === 'CRITICAL') cur.critical += 1;
    if (r.riskLevel === 'HIGH') cur.high += 1;
    cur.scoreSum += r.riskScore;
    cur.avgScore = Math.round(cur.scoreSum / cur.reports);
    bucketMap.set(dStr, cur);
  }

  const activityOverTime = Array.from(bucketMap.values()).slice(-20);

  // 2. Build Category Distribution
  const catCounts = new Map<string, { count: number; totalLoss: number; highRisk: number }>();
  for (const r of filteredReports) {
    const cur = catCounts.get(r.category) || { count: 0, totalLoss: 0, highRisk: 0 };
    cur.count += 1;
    cur.totalLoss += r.financialLossAmount;
    if (r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH') cur.highRisk += 1;
    catCounts.set(r.category, cur);
  }
  const categoryDistribution = Array.from(catCounts.entries()).map(([cat, stats]) => ({
    category: cat,
    label: formatCategoryLabel(cat),
    count: stats.count,
    highRisk: stats.highRisk,
    totalLoss: Math.round(stats.totalLoss),
  }));

  // 3. Build Risk Level Distribution (Low, Medium, High, Critical)
  const riskBuckets = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const r of filteredReports) {
    const lvl = r.riskLevel as keyof typeof riskBuckets;
    if (riskBuckets[lvl] !== undefined) {
      riskBuckets[lvl] += 1;
    }
  }
  const riskDistribution = [
    { level: 'Low (0–24)', key: 'LOW', count: riskBuckets.LOW, color: '#10B981' },
    { level: 'Medium (25–49)', key: 'MEDIUM', count: riskBuckets.MEDIUM, color: '#6366F1' },
    { level: 'High (50–74)', key: 'HIGH', count: riskBuckets.HIGH, color: '#F59E0B' },
    { level: 'Critical (75–100)', key: 'CRITICAL', count: riskBuckets.CRITICAL, color: '#F43F5E' },
  ];

  // 4. Investigation Status Distribution
  const statusMap = new Map<string, number>();
  for (const c of allCases) {
    statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1);
  }
  const caseStatusDistribution = Array.from(statusMap.entries()).map(
    ([status, count]) => ({
      status,
      label: formatCategoryLabel(status),
      count,
    })
  );

  const mandatorySubtotal =
    totalScamReports +
    urlDomainCount +
    phoneCount +
    emailCount +
    messageSamplesCount +
    transactionsCount +
    casesTotalCount +
    evidenceTotalCount;

  return NextResponse.json({
    kpis: {
      totalScamReports,
      suspiciousIndicators: totalIndicators,
      highRiskInvestigations,
      activeCases,
      resolvedCases,
      pendingReviews,
    },
    datasetCounts: {
      scamReports: totalScamReports,
      urlDomainIndicators: urlDomainCount,
      phoneIndicators: phoneCount,
      emailIndicators: emailCount,
      upiOtherIndicators: upiOtherCount,
      messageSamples: messageSamplesCount,
      transactionRecords: transactionsCount,
      investigationCases: casesTotalCount,
      evidenceArtifacts: evidenceTotalCount,
      entityRelationships: relationshipsCount,
      mandatorySubtotal,
    },
    charts: {
      activityOverTime,
      categoryDistribution,
      riskDistribution,
      caseStatusDistribution,
      topPatterns: threatPatterns.slice(0, 8),
      rulePerformance: detectionRules,
    },
    recentActivity: {
      recentReports,
      recentIndicators,
      highPriorityCases,
      recentEvidence,
    },
  });
}

