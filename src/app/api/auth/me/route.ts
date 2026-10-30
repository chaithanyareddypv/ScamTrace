import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const unreadAlertsCount = await prisma.alert
    .count({
      where: { isRead: false },
    })
    .catch(() => 0);

  return NextResponse.json({
    authenticated: true,
    user,
    unreadAlertsCount,
  });
}

