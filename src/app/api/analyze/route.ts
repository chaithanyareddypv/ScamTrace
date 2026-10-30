import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  AnalyzeInputSchema,
  runExplainableAnalysis,
} from '@/services/analysis-engine';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recentAnalyses = await prisma.analysisResult.findMany({
    orderBy: { createdAt: 'desc' },
    take: 25,
    include: {
      factors: true,
    },
  });

  return NextResponse.json({ analyses: recentAnalyses });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = checkRateLimit(
      `analyze:${user.id}:${ip}`,
      Number(process.env.RATE_LIMIT_ANALYZE_MAX || 50),
      Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)
    );

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error:
            'Analysis rate limit exceeded. Please wait before submitting additional indicators.',
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = AnalyzeInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || 'Invalid analysis input payload',
        },
        { status: 400 }
      );
    }

    const result = await runExplainableAnalysis({
      inputType: parsed.data.inputType,
      rawInput: parsed.data.rawInput,
      userId: user.id,
      saveToDatabase: parsed.data.saveToDatabase,
    });

    await prisma.auditLog
      .create({
        data: {
          action: 'ANALYSIS_EXECUTED',
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          targetType: 'AnalysisResult',
          targetId: result.id || 'TRANSIENT',
          summary: `${user.fullName} analyzed ${result.inputType} indicator (Risk Score: ${result.riskScore}/100 - ${result.riskLevel}).`,
          ipAddress: ip,
        },
      })
      .catch(() => undefined);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Analysis route error:', error);
    return NextResponse.json(
      { error: 'Explainable analysis engine encountered an error.' },
      { status: 500 }
    );
  }
}

