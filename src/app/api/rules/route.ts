import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { canPerformAction, getSessionUser } from '@/lib/auth';
import { runExplainableAnalysis } from '@/services/analysis-engine';

const UpdateRuleSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  scoreWeight: z
    .number()
    .int()
    .min(5, 'Score weight must be at least 5')
    .max(45, 'Score weight cannot exceed 45')
    .optional(),
});

const TestRuleSchema = z.object({
  inputType: z.enum(['URL', 'EMAIL', 'PHONE', 'MESSAGE', 'UPI', 'TRANSACTION']),
  sampleInput: z.string().min(3).max(3000),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rules = await prisma.detectionRule.findMany({
    orderBy: [{ isActive: 'desc' }, { scoreWeight: 'desc' }],
  });

  return NextResponse.json({ rules });
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(user.role, 'MANAGE_RULES')) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Only Administrator accounts can modify detection rule weights or status.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = UpdateRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const existing = await prisma.detectionRule.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Detection rule not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.isActive !== undefined)
      updateData.isActive = parsed.data.isActive;
    if (parsed.data.scoreWeight !== undefined) {
      updateData.scoreWeight = Math.min(
        existing.maxWeight,
        parsed.data.scoreWeight
      );
    }

    const updated = await prisma.detectionRule.update({
      where: { id: parsed.data.id },
      data: updateData,
    });

    await prisma.alert
      .create({
        data: {
          id: `ALT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
          title: `Detection Rule Modified: ${updated.code}`,
          message: `${user.fullName} updated rule "${updated.name}" (Active: ${updated.isActive}, Weight: +${updated.scoreWeight} pts).`,
          category: 'RULE_MODIFICATION',
          severity: 'INFO',
          actionUrl: '/app/rules',
          relatedEntityId: updated.id,
          userId: user.id,
        },
      })
      .catch(() => undefined);

    await prisma.auditLog.create({
      data: {
        action: 'RULE_UPDATED',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'DetectionRule',
        targetId: updated.id,
        summary: `${user.fullName} updated rule ${updated.code} (Active=${updated.isActive}, Weight=${updated.scoreWeight}).`,
        metadataJson: JSON.stringify({
          previousWeight: existing.scoreWeight,
          newWeight: updated.scoreWeight,
          previousActive: existing.isActive,
          newActive: updated.isActive,
        }),
      },
    });

    return NextResponse.json({ rule: updated });
  } catch (error) {
    console.error('Update rule error:', error);
    return NextResponse.json(
      { error: 'Failed to update detection rule.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = TestRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid test input' },
        { status: 400 }
      );
    }

    const testResult = await runExplainableAnalysis({
      inputType: parsed.data.inputType,
      rawInput: parsed.data.sampleInput,
      userId: user.id,
      saveToDatabase: false,
    });

    return NextResponse.json({ testResult });
  } catch {
    return NextResponse.json(
      { error: 'Rule simulation failed.' },
      { status: 500 }
    );
  }
}

