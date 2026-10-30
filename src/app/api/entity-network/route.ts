import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const relationshipType = searchParams.get('relationshipType') || 'ALL';
  const riskFilter = searchParams.get('riskLevel') || 'ALL';
  const limit = Math.min(180, Math.max(20, Number(searchParams.get('limit') || 95)));

  const where: Record<string, unknown> = {};
  if (relationshipType !== 'ALL') {
    where.relationshipType = relationshipType;
  }
  if (riskFilter !== 'ALL') {
    where.OR = [
      { sourceRiskLevel: riskFilter },
      { targetRiskLevel: riskFilter },
    ];
  }
  if (q) {
    where.OR = [
      { sourceId: { contains: q } },
      { sourceLabel: { contains: q } },
      { targetId: { contains: q } },
      { targetLabel: { contains: q } },
      { evidenceSummary: { contains: q } },
    ];
  }

  const edges = await prisma.entityRelationship.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // Construct unique nodes from the database edges
  const nodeMap = new Map<
    string,
    {
      id: string;
      entityType: string;
      label: string;
      riskLevel: string;
      degree: number;
      connectedEdges: string[];
    }
  >();

  for (const edge of edges) {
    const src = nodeMap.get(edge.sourceId) || {
      id: edge.sourceId,
      entityType: edge.sourceType,
      label: edge.sourceLabel,
      riskLevel: edge.sourceRiskLevel,
      degree: 0,
      connectedEdges: [],
    };
    src.degree += 1;
    src.connectedEdges.push(edge.id);
    nodeMap.set(edge.sourceId, src);

    const tgt = nodeMap.get(edge.targetId) || {
      id: edge.targetId,
      entityType: edge.targetType,
      label: edge.targetLabel,
      riskLevel: edge.targetRiskLevel,
      degree: 0,
      connectedEdges: [],
    };
    tgt.degree += 1;
    tgt.connectedEdges.push(edge.id);
    nodeMap.set(edge.targetId, tgt);
  }

  return NextResponse.json({
    nodes: Array.from(nodeMap.values()),
    edges,
    totalStoredRelationships: await prisma.entityRelationship.count(),
  });
}

