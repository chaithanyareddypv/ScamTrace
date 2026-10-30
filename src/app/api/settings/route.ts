import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { canPerformAction, getSessionUser } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';

const UpdateSettingsSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  department: z.string().min(2).max(80).optional(),
  notifyHighRisk: z.boolean().optional(),
  notifyCaseAssign: z.boolean().optional(),
  notifyEvidence: z.boolean().optional(),
  notifyRules: z.boolean().optional(),
  themePreference: z.enum(['light', 'slate', 'high-contrast']).optional(),
  targetUserId: z.string().optional(),
  targetUserRole: z.enum(['ADMINISTRATOR', 'INVESTIGATOR', 'VIEWER']).optional(),
  targetUserActive: z.boolean().optional(),
});

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [profile, users] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        avatarColor: true,
        notifyHighRisk: true,
        notifyCaseAssign: true,
        notifyEvidence: true,
        notifyRules: true,
        themePreference: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ profile, users });
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    // Administrator role management
    if (parsed.data.targetUserId) {
      if (!canPerformAction(sessionUser.role, 'MANAGE_USERS')) {
        return NextResponse.json(
          {
            error:
              'Forbidden: Only Administrators can modify user roles or account status.',
          },
          { status: 403 }
        );
      }

      const adminUpdate: Record<string, unknown> = {};
      if (parsed.data.targetUserRole !== undefined)
        adminUpdate.role = parsed.data.targetUserRole;
      if (parsed.data.targetUserActive !== undefined)
        adminUpdate.isActive = parsed.data.targetUserActive;

      const updatedUser = await prisma.user.update({
        where: { id: parsed.data.targetUserId },
        data: adminUpdate,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          department: true,
          isActive: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'SETTINGS_UPDATED',
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          actorRole: sessionUser.role,
          targetType: 'User',
          targetId: updatedUser.id,
          summary: `${sessionUser.fullName} updated user ${updatedUser.email} (Role: ${updatedUser.role}, Active: ${updatedUser.isActive}).`,
        },
      });

      return NextResponse.json({ updatedUser });
    }

    // Self profile & notification preferences update
    const selfUpdate: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined)
      selfUpdate.fullName = sanitizeText(parsed.data.fullName);
    if (parsed.data.department !== undefined)
      selfUpdate.department = sanitizeText(parsed.data.department);
    if (parsed.data.notifyHighRisk !== undefined)
      selfUpdate.notifyHighRisk = parsed.data.notifyHighRisk;
    if (parsed.data.notifyCaseAssign !== undefined)
      selfUpdate.notifyCaseAssign = parsed.data.notifyCaseAssign;
    if (parsed.data.notifyEvidence !== undefined)
      selfUpdate.notifyEvidence = parsed.data.notifyEvidence;
    if (parsed.data.notifyRules !== undefined)
      selfUpdate.notifyRules = parsed.data.notifyRules;
    if (parsed.data.themePreference !== undefined)
      selfUpdate.themePreference = parsed.data.themePreference;

    const updatedProfile = await prisma.user.update({
      where: { id: sessionUser.id },
      data: selfUpdate,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        notifyHighRisk: true,
        notifyCaseAssign: true,
        notifyEvidence: true,
        notifyRules: true,
        themePreference: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'SETTINGS_UPDATED',
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        actorRole: sessionUser.role,
        targetType: 'UserProfile',
        targetId: sessionUser.id,
        summary: `${sessionUser.fullName} updated personal workspace preferences.`,
      },
    });

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings.' },
      { status: 500 }
    );
  }
}

