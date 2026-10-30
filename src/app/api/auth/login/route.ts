import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import type { UserRole } from '@/types/scamtrace';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = checkRateLimit(
      `login:${ip}`,
      Number(process.env.RATE_LIMIT_LOGIN_MAX || 20),
      Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)
    );

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please wait a minute before retrying.',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Invalid login credentials',
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid email address or password.' },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email address or password.' },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'UserSession',
        targetId: user.id,
        summary: `${user.fullName} (${user.role}) signed in to ScamTrace.`,
        ipAddress: ip,
      },
    });

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      department: user.department,
      avatarColor: user.avatarColor,
    };

    const token = await createSessionToken(sessionUser, rememberMe);

    const response = NextResponse.json({
      user: sessionUser,
      message: 'Authentication successful',
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication service encountered an unexpected error.' },
      { status: 500 }
    );
  }
}

