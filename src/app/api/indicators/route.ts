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
  const type = searchParams.get('type') || 'ALL';
  const riskLevel = searchParams.get('riskLevel') || 'ALL';
  const category = searchParams.get('category') || 'ALL';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get('pageSize') || 15)));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { id: { contains: q } },
      { value: { contains: q } },
      { normalizedValue: { contains: q } },
      { summaryReason: { contains: q } },
    ];
  }
  if (type !== 'ALL') where.type = type;
  if (riskLevel !== 'ALL') where.riskLevel = riskLevel;
  if (category !== 'ALL') where.category = category;

  const [total, indicators] = await Promise.all([
    prisma.indicator.count({ where }),
    prisma.indicator.findMany({
      where,
      orderBy: [{ riskScore: 'desc' }, { lastSeenAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        investigationCase: {
          select: { id: true, caseNumber: true, title: true, status: true },
        },
        threatPattern: {
          select: { id: true, code: true, name: true, severity: true },
        },
        _count: {
          select: {
            reports: true,
            transactions: true,
            messageSamples: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    indicators,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

