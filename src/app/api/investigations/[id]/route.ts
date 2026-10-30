import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { canPerformAction, getSessionUser } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';

const UpdateCaseSchema = z.object({
  status: z
    .enum([
      'NEW',
      'UNDER_INVESTIGATION',
      'PENDING_REVIEW',
      'RESOLVED',
      'CLOSED',
    ])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedToId: z.string().nullable().optional(),
  resolutionSummary: z.string().max(2000).nullable().optional(),
  noteContent: z.string().min(2).max(2000).optional(),
  linkReportId: z.string().optional(),
  linkIndicatorId: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const investigationCase = await prisma.investigationCase.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: {
        select: { id: true, fullName: true, email: true, role: true, department: true },
      },
      reports: {
        orderBy: { createdAt: 'desc' },
      },
      indicators: {
        orderBy: { riskScore: 'desc' },
      },
      evidence: {
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, fullName: true, email: true } },
        },
      },
      notes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!investigationCase) {
    return NextResponse.json(
      { error: 'Investigation case not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ investigationCase });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(user.role, 'UPDATE_CASE')) {
      return NextResponse.json(
        { error: 'Forbidden: Viewer role cannot modify investigation cases.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = UpdateCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const {
      status,
      priority,
      assignedToId,
      resolutionSummary,
      noteContent,
      linkReportId,
      linkIndicatorId,
    } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (resolutionSummary !== undefined)
      updateData.resolutionSummary = resolutionSummary
        ? sanitizeText(resolutionSummary)
        : null;

    if (linkReportId) {
      await prisma.scamReport.update({
        where: { id: linkReportId },
        data: { caseId: params.id },
      });
    }

    if (linkIndicatorId) {
      await prisma.indicator.update({
        where: { id: linkIndicatorId },
        data: { caseId: params.id },
      });
    }

    if (noteContent) {
      await prisma.caseNote.create({
        data: {
          caseId: params.id,
          authorId: user.id,
          authorName: user.fullName,
          noteType: status ? 'STATUS_CHANGE' : 'ANALYST_NOTE',
          content: sanitizeText(noteContent),
        },
      });
    } else if (status) {
      await prisma.caseNote.create({
        data: {
          caseId: params.id,
          authorId: user.id,
          authorName: user.fullName,
          noteType: 'STATUS_CHANGE',
          content: `Status updated to ${status.replace(/_/g, ' ')} by ${user.fullName}.`,
        },
      });
    }

    const updatedCase = await prisma.investigationCase.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: true,
        reports: true,
        indicators: true,
        evidence: true,
        notes: { orderBy: { createdAt: 'desc' } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: status
          ? 'CASE_STATUS_CHANGED'
          : assignedToId
          ? 'CASE_ASSIGNED'
          : 'CASE_UPDATED',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'InvestigationCase',
        targetId: updatedCase.id,
        summary: `${user.fullName} updated case ${updatedCase.caseNumber} (Status: ${updatedCase.status}, Priority: ${updatedCase.priority}).`,
      },
    });

    return NextResponse.json({ investigationCase: updatedCase });
  } catch (error) {
    console.error('Update case error:', error);
    return NextResponse.json(
      { error: 'Failed to update investigation case.' },
      { status: 500 }
    );
  }
}

