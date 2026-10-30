import { NextResponse } from 'next/server';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (user) {
      await prisma.auditLog
        .create({
          data: {
            action: 'USER_LOGOUT',
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            targetType: 'UserSession',
            targetId: user.id,
            summary: `${user.fullName} (${user.role}) signed out of ScamTrace.`,
          },
        })
        .catch(() => undefined);
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json({ message: 'Logged out' });
  }
}

