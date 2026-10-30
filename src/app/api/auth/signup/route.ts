import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE_NAME,
  SignupSchema,
} from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeText } from '@/lib/utils';
import type { UserRole } from '@/types/scamtrace';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = checkRateLimit(`signup:${ip}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many registration requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Validation failed',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { fullName, email, password, role } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const safeName = sanitizeText(fullName);

    const createdUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        fullName: safeName,
        passwordHash,
        role: role as UserRole,
        department: 'Digital Scam Investigation Unit',
        avatarColor: '#4F46E5',
        lastLoginAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'USER_SIGNUP',
        actorId: createdUser.id,
        actorEmail: createdUser.email,
        actorRole: createdUser.role,
        targetType: 'User',
        targetId: createdUser.id,
        summary: `New account registered for ${createdUser.fullName} (${createdUser.role}).`,
        ipAddress: ip,
      },
    });

    const sessionUser = {
      id: createdUser.id,
      email: createdUser.email,
      fullName: createdUser.fullName,
      role: createdUser.role as UserRole,
      department: createdUser.department,
      avatarColor: createdUser.avatarColor,
    };

    const token = await createSessionToken(sessionUser, false);
    const response = NextResponse.json(
      {
        user: sessionUser,
        message: 'Account created successfully',
      },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Could not complete registration. Please try again.' },
      { status: 500 }
    );
  }
}

