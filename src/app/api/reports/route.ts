import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { canPerformAction, getSessionUser } from '@/lib/auth';
import { runExplainableAnalysis } from '@/services/analysis-engine';
import { sanitizeText } from '@/lib/utils';

const CreateReportSchema = z.object({
  title: z.string().min(4, 'Report title must be at least 4 characters').max(180),
  category: z.string().min(2),
  description: z.string().min(10, 'Description must be at least 10 characters').max(3000),
  submittedIndicatorValue: z.string().min(3, 'Indicator value is required').max(1500),
  submittedIndicatorType: z.enum([
    'URL',
    'DOMAIN',
    'PHONE',
    'EMAIL',
    'UPI',
    'TRANSACTION',
    'MESSAGE',
  ]),
  financialLossAmount: z.number().min(0).optional().default(0),
  caseId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const category = searchParams.get('category') || 'ALL';
  const riskLevel = searchParams.get('riskLevel') || 'ALL';
  const status = searchParams.get('status') || 'ALL';
  const dateRange = searchParams.get('dateRange') || 'ALL';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get('pageSize') || 15)));

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { reportNumber: { contains: q } },
      { title: { contains: q } },
      { description: { contains: q } },
      { submittedIndicatorValue: { contains: q } },
    ];
  }
  if (category !== 'ALL') {
    where.category = category;
  }
  if (riskLevel !== 'ALL') {
    where.riskLevel = riskLevel;
  }
  if (status !== 'ALL') {
    where.status = status;
  }
  if (dateRange !== 'ALL') {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    where.createdAt = {
      gte: new Date(Date.now() - days * 24 * 3600 * 1000),
    };
  }

  const orderByField = ['createdAt', 'riskScore', 'reportNumber', 'financialLossAmount'].includes(sortBy)
    ? sortBy
    : 'createdAt';

  const [total, reports] = await Promise.all([
    prisma.scamReport.count({ where }),
    prisma.scamReport.findMany({
      where,
      orderBy: { [orderByField]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        investigationCase: {
          select: { id: true, caseNumber: true, title: true, status: true },
        },
        indicator: {
          select: { id: true, value: true, type: true, riskScore: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    reports,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(user.role, 'CREATE_REPORT')) {
      return NextResponse.json(
        { error: 'Forbidden: Viewer role cannot create new scam reports.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CreateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const {
      title,
      category,
      description,
      submittedIndicatorValue,
      submittedIndicatorType,
      financialLossAmount,
      caseId,
    } = parsed.data;

    // Run explainable analysis on the submitted indicator
    const analysisType =
      submittedIndicatorType === 'DOMAIN' ? 'URL' : submittedIndicatorType;
    const analysis = await runExplainableAnalysis({
      inputType: analysisType,
      rawInput: submittedIndicatorValue,
      userId: user.id,
      saveToDatabase: true,
    });

    const count = await prisma.scamReport.count();
    const nextNum = String(count + 1).padStart(4, '0');
    const reportId = `RPT-2026-${nextNum}-${Math.floor(Math.random() * 90 + 10)}`;

    // Upsert indicator in DB
    const existingInd = await prisma.indicator.findUnique({
      where: { value: submittedIndicatorValue.trim() },
    });

    let indicatorId = existingInd?.id;
    if (!existingInd) {
      const createdInd = await prisma.indicator.create({
        data: {
          id: `IND-${submittedIndicatorType.slice(0, 3)}-${Date.now().toString().slice(-5)}`,
          value: submittedIndicatorValue.trim(),
          normalizedValue: analysis.normalizedInput,
          type: submittedIndicatorType,
          category,
          riskScore: analysis.riskScore,
          riskLevel: analysis.riskLevel,
          confidenceScore: analysis.heuristicConfidence,
          status: 'ACTIVE',
          summaryReason: analysis.verdictSummary,
          technicalAttributesJson: JSON.stringify({
            extractedIndicators: analysis.extractedIndicators,
          }),
          sourceClassification: 'ANALYST_SUBMISSION',
          associationCount: 1,
          caseId: caseId || null,
        },
      });
      indicatorId = createdInd.id;
    }

    const report = await prisma.scamReport.create({
      data: {
        id: reportId,
        reportNumber: `RPT-2026-${nextNum}`,
        title: sanitizeText(title),
        category,
        description: sanitizeText(description),
        submittedIndicatorValue: submittedIndicatorValue.trim(),
        submittedIndicatorType,
        riskLevel: analysis.riskLevel,
        riskScore: analysis.riskScore,
        status: 'OPEN',
        reporterChannel: 'ANALYST_SUBMISSION',
        detectionExplanation: analysis.detailedExplanation,
        triggeredRulesJson: JSON.stringify(
          analysis.triggeredFactors.map((f) => ({
            code: f.ruleCode,
            weight: f.scoreContribution,
            name: f.factorName,
          }))
        ),
        financialLossAmount,
        caseId: caseId || null,
        indicatorId: indicatorId || null,
        createdById: user.id,
      },
      include: {
        investigationCase: true,
        indicator: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'REPORT_CREATED',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'ScamReport',
        targetId: report.id,
        summary: `${user.fullName} created scam report ${report.reportNumber} (Risk: ${report.riskScore}/100).`,
      },
    });

    return NextResponse.json({ report, analysis }, { status: 201 });
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json(
      { error: 'Failed to create scam report.' },
      { status: 500 }
    );
  }
}

