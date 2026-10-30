import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { canPerformAction, getSessionUser } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';

const UpdateReportSchema = z.object({
  status: z
    .enum([
      'OPEN',
      'TRIAGED',
      'INVESTIGATING',
      'VERIFIED_SCAM',
      'ARCHIVED',
      'FALSE_POSITIVE',
    ])
    .optional(),
  caseId: z.string().nullable().optional(),
  title: z.string().min(4).max(180).optional(),
  description: z.string().min(10).max(3000).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const report = await prisma.scamReport.findUnique({
    where: { id: params.id },
    include: {
      investigationCase: {
        include: {
          evidence: true,
          assignedTo: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      },
      indicator: {
        include: {
          threatPattern: true,
          transactions: { take: 5 },
          messageSamples: { take: 5 },
        },
      },
      createdBy: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const relatedRelationships = await prisma.entityRelationship.findMany({
    where: {
      OR: [
        { sourceId: report.id },
        { targetId: report.id },
        ...(report.indicatorId
          ? [{ sourceId: report.indicatorId }, { targetId: report.indicatorId }]
          : []),
      ],
    },
    take: 20,
  });

  return NextResponse.json({ report, relatedRelationships });
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

    if (!canPerformAction(user.role, 'EDIT_REPORT')) {
      return NextResponse.json(
        { error: 'Forbidden: Viewer role cannot modify scam reports.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = UpdateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.caseId !== undefined) updateData.caseId = parsed.data.caseId;
    if (parsed.data.title !== undefined)
      updateData.title = sanitizeText(parsed.data.title);
    if (parsed.data.description !== undefined)
      updateData.description = sanitizeText(parsed.data.description);

    const updated = await prisma.scamReport.update({
      where: { id: params.id },
      data: updateData,
      include: {
        investigationCase: true,
        indicator: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'REPORT_UPDATED',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'ScamReport',
        targetId: updated.id,
        summary: `${user.fullName} updated report ${updated.reportNumber} (Status: ${updated.status}, Case: ${updated.caseId || 'Unlinked'}).`,
      },
    });

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json(
      { error: 'Failed to update scam report.' },
      { status: 500 }
    );
  }
}

