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
  const action = searchParams.get('action') || 'ALL';
  const role = searchParams.get('role') || 'ALL';
  const q = (searchParams.get('q') || '').trim();

  const where: Record<string, unknown> = {};
  if (action !== 'ALL') where.action = action;
  if (role !== 'ALL') where.actorRole = role;
  if (q) {
    where.OR = [
      { actorEmail: { contains: q } },
      { summary: { contains: q } },
      { targetId: { contains: q } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ logs });
}

