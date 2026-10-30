import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const indicator = await prisma.indicator.findUnique({
    where: { id: params.id },
    include: {
      investigationCase: true,
      threatPattern: true,
      reports: {
        orderBy: { createdAt: 'desc' },
        take: 15,
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 15,
      },
      messageSamples: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!indicator) {
    return NextResponse.json({ error: 'Indicator not found' }, { status: 404 });
  }

  const relationships = await prisma.entityRelationship.findMany({
    where: {
      OR: [{ sourceId: indicator.id }, { targetId: indicator.id }],
    },
    take: 25,
  });

  return NextResponse.json({ indicator, relationships });
}

