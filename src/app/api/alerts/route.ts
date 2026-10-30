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
  const category = searchParams.get('category') || 'ALL';
  const status = searchParams.get('status') || 'ALL';

  const where: Record<string, unknown> = {};
  if (category !== 'ALL') where.category = category;
  if (status === 'UNREAD') where.isRead = false;
  if (status === 'READ') where.isRead = true;

  const [alerts, unreadCount] = await Promise.all([
    prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.alert.count({ where: { isRead: false } }),
  ]);

  return NextResponse.json({ alerts, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  if (body.markAllRead) {
    await prisma.alert.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ message: 'All notifications marked as read' });
  }

  if (body.id) {
    const updated = await prisma.alert.update({
      where: { id: String(body.id) },
      data: { isRead: Boolean(body.isRead ?? true) },
    });
    return NextResponse.json({ alert: updated });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

