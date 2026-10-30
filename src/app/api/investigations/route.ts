import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { canPerformAction, getSessionUser } from '@/lib/auth';
import { getRiskLevelFromScore, sanitizeText } from '@/lib/utils';

const CreateCaseSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(180),
  description: z.string().min(10, 'Description must be at least 10 characters').max(3000),
  category: z.string().min(2),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  riskScore: z.number().min(0).max(100).optional().default(70),
  assignedToId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const status = searchParams.get('status') || 'ALL';
  const priority = searchParams.get('priority') || 'ALL';
  const riskLevel = searchParams.get('riskLevel') || 'ALL';

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { caseNumber: { contains: q } },
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (status !== 'ALL') where.status = status;
  if (priority !== 'ALL') where.priority = priority;
  if (riskLevel !== 'ALL') where.riskLevel = riskLevel;

  const [cases, investigators] = await Promise.all([
    prisma.investigationCase.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, fullName: true, email: true, role: true, avatarColor: true },
        },
        _count: {
          select: {
            reports: true,
            indicators: true,
            evidence: true,
            notes: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ['ADMINISTRATOR', 'INVESTIGATOR'] } },
      select: { id: true, fullName: true, email: true, role: true, department: true },
    }),
  ]);

  return NextResponse.json({ cases, investigators });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(user.role, 'CREATE_CASE')) {
      return NextResponse.json(
        { error: 'Forbidden: Viewer role cannot create investigation cases.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CreateCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { title, description, category, priority, riskScore, assignedToId } =
      parsed.data;

    const count = await prisma.investigationCase.count();
    const nextNum = String(count + 1).padStart(4, '0');
    const caseId = `CASE-2026-${nextNum}`;
    const riskLevel = getRiskLevelFromScore(riskScore);

    const createdCase = await prisma.investigationCase.create({
      data: {
        id: caseId,
        caseNumber: caseId,
        title: sanitizeText(title),
        description: sanitizeText(description),
        category,
        priority,
        riskLevel,
        riskScore,
        status: 'NEW',
        assignedToId: assignedToId || user.id,
        notes: {
          create: {
            authorId: user.id,
            authorName: user.fullName,
            noteType: 'TRIAGE_SUMMARY',
            content: `Case ${caseId} initialized by ${user.fullName} with ${priority} priority.`,
          },
        },
      },
      include: {
        assignedTo: true,
        _count: {
          select: { reports: true, indicators: true, evidence: true, notes: true },
        },
      },
    });

    await prisma.alert
      .create({
        data: {
          id: `ALT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
          title: `New Investigation Opened: ${createdCase.caseNumber}`,
          message: `${user.fullName} opened "${createdCase.title}" (${createdCase.priority} priority).`,
          category: 'NEW_INVESTIGATION',
          severity: priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          actionUrl: `/app/investigations`,
          relatedEntityId: createdCase.id,
          userId: createdCase.assignedToId,
        },
      })
      .catch(() => undefined);

    await prisma.auditLog.create({
      data: {
        action: 'CASE_CREATED',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'InvestigationCase',
        targetId: createdCase.id,
        summary: `${user.fullName} created investigation case ${createdCase.caseNumber}.`,
      },
    });

    return NextResponse.json({ investigationCase: createdCase }, { status: 201 });
  } catch (error) {
    console.error('Create case error:', error);
    return NextResponse.json(
      { error: 'Failed to create investigation case.' },
      { status: 500 }
    );
  }
}

