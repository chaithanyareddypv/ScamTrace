import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { canPerformAction, getSessionUser } from '@/lib/auth';
import { toCsvContent } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canPerformAction(user.role, 'EXPORT_DATA')) {
    return NextResponse.json(
      { error: 'Forbidden: Viewer role does not have data export permissions.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'reports';
  const category = searchParams.get('category') || 'ALL';
  const riskLevel = searchParams.get('riskLevel') || 'ALL';
  const status = searchParams.get('status') || 'ALL';
  const q = (searchParams.get('q') || '').trim();

  let csvString = '';
  let filename = `scamtrace_${type}_export.csv`;

  if (type === 'reports') {
    const where: Record<string, unknown> = {};
    if (category !== 'ALL') where.category = category;
    if (riskLevel !== 'ALL') where.riskLevel = riskLevel;
    if (status !== 'ALL') where.status = status;
    if (q) {
      where.OR = [
        { reportNumber: { contains: q } },
        { title: { contains: q } },
        { submittedIndicatorValue: { contains: q } },
      ];
    }

    const reports = await prisma.scamReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    csvString = toCsvContent(
      [
        'Report Number',
        'Title',
        'Category',
        'Indicator Type',
        'Indicator Value',
        'Risk Score',
        'Risk Level',
        'Status',
        'Financial Loss (USD)',
        'Linked Case ID',
        'Detection Explanation',
        'Created At',
      ],
      reports.map((r) => [
        r.reportNumber,
        r.title,
        r.category,
        r.submittedIndicatorType,
        r.submittedIndicatorValue,
        r.riskScore,
        r.riskLevel,
        r.status,
        r.financialLossAmount,
        r.caseId || 'Unlinked',
        r.detectionExplanation,
        r.createdAt.toISOString(),
      ])
    );
    filename = 'scamtrace_scam_reports.csv';
  } else if (type === 'indicators') {
    const indType = searchParams.get('indicatorType') || 'ALL';
    const where: Record<string, unknown> = {};
    if (indType !== 'ALL') where.type = indType;
    if (riskLevel !== 'ALL') where.riskLevel = riskLevel;
    if (category !== 'ALL') where.category = category;
    if (q) {
      where.OR = [{ value: { contains: q } }, { id: { contains: q } }];
    }

    const indicators = await prisma.indicator.findMany({
      where,
      orderBy: { riskScore: 'desc' },
      take: 1000,
    });

    csvString = toCsvContent(
      [
        'Indicator ID',
        'Type',
        'Value',
        'Category',
        'Risk Score',
        'Risk Level',
        'Confidence',
        'Status',
        'Associations',
        'Summary Reason',
        'First Seen',
        'Last Seen',
      ],
      indicators.map((ind) => [
        ind.id,
        ind.type,
        ind.value,
        ind.category,
        ind.riskScore,
        ind.riskLevel,
        ind.confidenceScore,
        ind.status,
        ind.associationCount,
        ind.summaryReason,
        ind.firstSeenAt.toISOString(),
        ind.lastSeenAt.toISOString(),
      ])
    );
    filename = 'scamtrace_indicators.csv';
  } else if (type === 'investigations') {
    const where: Record<string, unknown> = {};
    if (status !== 'ALL') where.status = status;
    if (riskLevel !== 'ALL') where.riskLevel = riskLevel;

    const cases = await prisma.investigationCase.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { assignedTo: true },
    });

    csvString = toCsvContent(
      [
        'Case Number',
        'Title',
        'Category',
        'Priority',
        'Risk Score',
        'Risk Level',
        'Status',
        'Assigned Investigator',
        'Created At',
        'Updated At',
      ],
      cases.map((c) => [
        c.caseNumber,
        c.title,
        c.category,
        c.priority,
        c.riskScore,
        c.riskLevel,
        c.status,
        c.assignedTo?.fullName || 'Unassigned',
        c.createdAt.toISOString(),
        c.updatedAt.toISOString(),
      ])
    );
    filename = 'scamtrace_investigations.csv';
  } else if (type === 'audit-logs') {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    csvString = toCsvContent(
      ['Audit ID', 'Action', 'Actor Email', 'Actor Role', 'Target Type', 'Target ID', 'Summary', 'IP Address', 'Timestamp'],
      logs.map((l) => [
        l.id,
        l.action,
        l.actorEmail,
        l.actorRole,
        l.targetType,
        l.targetId,
        l.summary,
        l.ipAddress,
        l.createdAt.toISOString(),
      ])
    );
    filename = 'scamtrace_audit_logs.csv';
  }

  await prisma.auditLog
    .create({
      data: {
        action: 'DATA_EXPORTED',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: type.toUpperCase(),
        targetId: filename,
        summary: `${user.fullName} exported ${type} dataset as CSV (${filename}).`,
      },
    })
    .catch(() => undefined);

  return new NextResponse(csvString, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

