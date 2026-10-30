import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({
      query: q,
      results: {
        reports: [],
        investigations: [],
        indicators: [],
        evidence: [],
        transactions: [],
      },
      totalMatches: 0,
    });
  }

  const [reports, investigations, indicators, evidence, transactions] =
    await Promise.all([
      prisma.scamReport.findMany({
        where: {
          OR: [
            { reportNumber: { contains: q } },
            { title: { contains: q } },
            { submittedIndicatorValue: { contains: q } },
            { category: { contains: q } },
          ],
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reportNumber: true,
          title: true,
          category: true,
          riskLevel: true,
          riskScore: true,
          status: true,
        },
      }),
      prisma.investigationCase.findMany({
        where: {
          OR: [
            { caseNumber: { contains: q } },
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        },
        take: 6,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          caseNumber: true,
          title: true,
          priority: true,
          riskLevel: true,
          riskScore: true,
          status: true,
        },
      }),
      prisma.indicator.findMany({
        where: {
          OR: [
            { id: { contains: q } },
            { value: { contains: q } },
            { normalizedValue: { contains: q } },
            { summaryReason: { contains: q } },
          ],
        },
        take: 6,
        orderBy: { riskScore: 'desc' },
        select: {
          id: true,
          value: true,
          type: true,
          category: true,
          riskLevel: true,
          riskScore: true,
        },
      }),
      prisma.evidence.findMany({
        where: {
          OR: [
            { evidenceCode: { contains: q } },
            { title: { contains: q } },
            { fileName: { contains: q } },
            { sha256Hash: { contains: q } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          evidenceCode: true,
          title: true,
          type: true,
          fileName: true,
          verificationStatus: true,
          caseId: true,
        },
      }),
      prisma.transactionEvent.findMany({
        where: {
          OR: [
            { referenceId: { contains: q } },
            { receiverHandle: { contains: q } },
            { merchantDisplayName: { contains: q } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          referenceId: true,
          paymentRail: true,
          receiverHandle: true,
          amount: true,
          riskLevel: true,
          riskScore: true,
        },
      }),
    ]);

  const totalMatches =
    reports.length +
    investigations.length +
    indicators.length +
    evidence.length +
    transactions.length;

  return NextResponse.json({
    query: q,
    results: {
      reports,
      investigations,
      indicators,
      evidence,
      transactions,
    },
    totalMatches,
  });
}

