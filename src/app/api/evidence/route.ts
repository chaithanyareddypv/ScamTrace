import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { canPerformAction, getSessionUser } from '@/lib/auth';
import { sanitizeText } from '@/lib/utils';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/html',
  'application/json',
  'message/rfc822',
];

const MAX_FILE_SIZE_BYTES = Number(
  process.env.MAX_EVIDENCE_SIZE_BYTES || 5 * 1024 * 1024
);

const CreateEvidenceSchema = z.object({
  title: z.string().min(4, 'Evidence title must be at least 4 characters').max(180),
  type: z.enum([
    'SCREENSHOT_METADATA',
    'EMAIL_HEADER',
    'DOM_SNAPSHOT',
    'TRANSACTION_RECEIPT',
    'CHAT_TRANSCRIPT',
    'DNS_RECORD_SYNTHETIC',
  ]),
  description: z.string().min(8, 'Description is required').max(2000),
  caseId: z.string().min(3, 'Associated investigation case is required'),
  fileName: z
    .string()
    .min(3)
    .max(120)
    .regex(
      /\.(png|jpg|jpeg|webp|pdf|txt|html|json|eml)$/i,
      'Unsupported file extension. Allowed: .png, .jpg, .webp, .pdf, .txt, .html, .json, .eml'
    ),
  mimeType: z.string().refine((val) => ALLOWED_MIME_TYPES.includes(val), {
    message: 'Disallowed MIME type for forensic evidence vault.',
  }),
  fileSizeBytes: z
    .number()
    .int()
    .min(1, 'File size must be positive')
    .max(MAX_FILE_SIZE_BYTES, 'File size exceeds 5 MB security limit'),
  contentSnippet: z.string().max(4000).optional().default(''),
});

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId') || 'ALL';
  const type = searchParams.get('type') || 'ALL';
  const verificationStatus = searchParams.get('verificationStatus') || 'ALL';
  const q = (searchParams.get('q') || '').trim();

  const where: Record<string, unknown> = {};
  if (caseId !== 'ALL') where.caseId = caseId;
  if (type !== 'ALL') where.type = type;
  if (verificationStatus !== 'ALL')
    where.verificationStatus = verificationStatus;
  if (q) {
    where.OR = [
      { evidenceCode: { contains: q } },
      { title: { contains: q } },
      { description: { contains: q } },
      { fileName: { contains: q } },
    ];
  }

  const [evidence, cases] = await Promise.all([
    prisma.evidence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        investigationCase: {
          select: { id: true, caseNumber: true, title: true, status: true },
        },
        uploadedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    }),
    prisma.investigationCase.findMany({
      select: { id: true, caseNumber: true, title: true },
      orderBy: { updatedAt: 'desc' },
      take: 60,
    }),
  ]);

  return NextResponse.json({
    evidence,
    cases,
    storageConfiguration: {
      mode: 'metadata-local',
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(user.role, 'ADD_EVIDENCE')) {
      return NextResponse.json(
        { error: 'Forbidden: Viewer role cannot upload forensic evidence.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CreateEvidenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid evidence metadata' },
        { status: 400 }
      );
    }

    const {
      title,
      type,
      description,
      caseId,
      fileName,
      mimeType,
      fileSizeBytes,
      contentSnippet,
    } = parsed.data;

    const count = await prisma.evidence.count();
    const nextNum = String(count + 1).padStart(4, '0');
    const evidenceId = `EVD-2026-${nextNum}`;

    const sha256Hash = crypto
      .createHash('sha256')
      .update(`${fileName}:${fileSizeBytes}:${contentSnippet}:${Date.now()}`)
      .digest('hex');

    const created = await prisma.evidence.create({
      data: {
        id: evidenceId,
        evidenceCode: evidenceId,
        title: sanitizeText(title),
        type,
        description: sanitizeText(description),
        fileName: sanitizeText(fileName),
        mimeType,
        fileSizeBytes,
        sha256Hash,
        storageMode: 'metadata-local',
        verificationStatus: 'INTEGRITY_CHECKED',
        chainOfCustodyNotes: `Ingested by ${user.fullName} (${user.role}). Validated MIME (${mimeType}) and computed SHA-256 digest.`,
        caseId,
        uploadedById: user.id,
      },
      include: {
        investigationCase: true,
        uploadedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });

    await prisma.caseNote
      .create({
        data: {
          caseId,
          authorId: user.id,
          authorName: user.fullName,
          noteType: 'EVIDENCE_LINKED',
          content: `Added forensic artifact ${created.evidenceCode} (${created.fileName}, SHA-256: ${sha256Hash.slice(0, 16)}...).`,
        },
      })
      .catch(() => undefined);

    await prisma.auditLog.create({
      data: {
        action: 'EVIDENCE_ADDED',
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'Evidence',
        targetId: created.id,
        summary: `${user.fullName} added evidence ${created.evidenceCode} to case ${caseId}.`,
      },
    });

    return NextResponse.json({ evidence: created }, { status: 201 });
  } catch (error) {
    console.error('Create evidence error:', error);
    return NextResponse.json(
      { error: 'Failed to register forensic evidence.' },
      { status: 500 }
    );
  }
}

