import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [patterns, repeatedIndicators, messageSamples, recentTransactions] =
    await Promise.all([
      prisma.threatPattern.findMany({
        orderBy: { detectionCount: 'desc' },
        include: {
          _count: { select: { indicators: true } },
        },
      }),
      prisma.indicator.findMany({
        orderBy: [{ associationCount: 'desc' }, { riskScore: 'desc' }],
        take: 12,
        include: {
          threatPattern: { select: { code: true, name: true } },
          investigationCase: { select: { id: true, caseNumber: true } },
        },
      }),
      prisma.messageSample.findMany({
        orderBy: { riskScore: 'desc' },
        take: 10,
      }),
      prisma.transactionEvent.findMany({
        orderBy: { riskScore: 'desc' },
        take: 10,
      }),
    ]);

  return NextResponse.json({
    patterns,
    repeatedIndicators,
    messageSamples,
    recentTransactions,
  });
}

