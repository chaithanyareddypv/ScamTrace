'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Search,
  RotateCcw,
  Network,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { getRiskBadgeClasses } from '@/lib/utils';

interface ApiGraphNode {
  id: string;
  entityType: string;
  label: string;
  riskLevel: string;
  degree: number;
  connectedEdges: string[];
}

interface ApiGraphEdge {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  sourceRiskLevel: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  targetRiskLevel: string;
  relationshipType: string;
  evidenceSummary: string;
  weight: number;
}

function getRiskNodeColors(riskLevel: string, isHighlighted: boolean) {
  const lvl = riskLevel.toUpperCase();
  if (lvl === 'CRITICAL') {
    return {
      bg: isHighlighted ? '#FFE4E6' : '#FFF1F2',
      border: isHighlighted ? '#E11D48' : '#FDA4AF',
      text: '#881337',
    };
  }
  if (lvl === 'HIGH') {
    return {
      bg: isHighlighted ? '#FEF3C7' : '#FFFBEB',
      border: isHighlighted ? '#D97706' : '#FCD34D',
      text: '#78350F',
    };
  }
  if (lvl === 'MEDIUM') {
    return {
      bg: isHighlighted ? '#E0E7FF' : '#EEF2FF',
      border: isHighlighted ? '#4F46E5' : '#A5B4FC',
      text: '#1E1B4B',
    };
  }
  return {
    bg: isHighlighted ? '#D1FAE5' : '#ECFDF5',
    border: isHighlighted ? '#059669' : '#6EE7B7',
    text: '#064E3B',
  };
}

export default function EntityNetworkPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [relationshipType, setRelationshipType] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [limit, setLimit] = useState(65);

  const [rawNodes, setRawNodes] = useState<ApiGraphNode[]>([]);
  const [rawEdges, setRawEdges] = useState<ApiGraphEdge[]>([]);
  const [totalStored, setTotalStored] = useState(260);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const fetchNetwork = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        relationshipType,
        riskLevel: riskFilter,
        limit: String(limit),
      });
      const res = await fetch(`/api/entity-network?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRawNodes(data.nodes || []);
        setRawEdges(data.edges || []);
        setTotalStored(data.totalStoredRelationships || 260);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, relationshipType, riskFilter, limit]);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  // Compute connected node set when a node is selected
  const connectedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNodeId) return set;
    set.add(selectedNodeId);
    for (const e of rawEdges) {
      if (e.sourceId === selectedNodeId) set.add(e.targetId);
      if (e.targetId === selectedNodeId) set.add(e.sourceId);
    }
    return set;
  }, [selectedNodeId, rawEdges]);

  // Layout nodes in concentric/clustered radial rings based on entity type
  useEffect(() => {
    const typeColumnIndex: Record<string, number> = {
      MESSAGE: 0,
      REPORT: 1,
      URL: 2,
      DOMAIN: 2,
      PHONE: 2,
      EMAIL: 2,
      UPI: 2,
      TRANSACTION: 3,
      CASE: 4,
    };

    const colCounters: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

    const flowNodes: Node[] = rawNodes.map((n) => {
      const col = typeColumnIndex[n.entityType] ?? 2;
      const rowIdx = colCounters[col] ?? 0;
      colCounters[col] = rowIdx + 1;

      const isHighlighted =
        !selectedNodeId || connectedNodeIds.has(n.id);
      const colors = getRiskNodeColors(n.riskLevel, selectedNodeId === n.id);

      return {
        id: n.id,
        position: {
          x: col * 270 + (rowIdx % 2) * 35,
          y: rowIdx * 92,
        },
        data: {
          label: `[${n.entityType}] ${n.label}`,
        },
        style: {
          background: colors.bg,
          color: colors.text,
          border: `${selectedNodeId === n.id ? '2.5px' : '1.5px'} solid ${colors.border}`,
          borderRadius: '8px',
          padding: '8px 10px',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'monospace',
          width: 220,
          opacity: isHighlighted ? 1 : 0.25,
          boxShadow:
            selectedNodeId === n.id
              ? '0 4px 14px rgba(99,91,255,0.28)'
              : '0 1px 3px rgba(10,37,64,0.06)',
        },
      };
    });

    const flowEdges: Edge[] = rawEdges.map((e) => {
      const isConnected =
        !selectedNodeId ||
        e.sourceId === selectedNodeId ||
        e.targetId === selectedNodeId;
      return {
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        label: e.relationshipType.replace(/_/g, ' '),
        animated: selectedNodeId === e.sourceId || selectedNodeId === e.targetId,
        labelStyle: { fontSize: 9, fill: '#475569', fontWeight: 600 },
        style: {
          stroke: isConnected ? '#635BFF' : '#CBD5E1',
          strokeWidth: isConnected && selectedNodeId ? 2.2 : 1.3,
          opacity: isConnected ? 1 : 0.2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isConnected ? '#635BFF' : '#CBD5E1',
        },
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [rawNodes, rawEdges, selectedNodeId, connectedNodeIds, setNodes, setEdges]);

  const selectedNodeData = rawNodes.find((n) => n.id === selectedNodeId) || null;
  const selectedNodeEdges = rawEdges.filter(
    (e) => e.sourceId === selectedNodeId || e.targetId === selectedNodeId
  );

  const handleReset = () => {
    setSearchQuery('');
    setRelationshipType('ALL');
    setRiskFilter('ALL');
    setSelectedNodeId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A2540]">
              Entity Relationship Network
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-50 text-[#635BFF] border border-indigo-200">
              {totalStored} Database Edges
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive graph mapping stored database relationships between Scam Reports, Indicators, Messages, Transactions, and Cases.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540]"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#635BFF]" />
          <span>Reset Graph View</span>
        </button>
      </div>

      {/* Controls & Search Bar */}
      <div className="radar-card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entity ID, domain, phone, case..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200"
          />
        </div>

        <select
          value={relationshipType}
          onChange={(e) => setRelationshipType(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Relationship Types</option>
          <option value="CONTAINS_INDICATOR">Contains Indicator (Report → Ind)</option>
          <option value="INVESTIGATED_IN">Investigated In (Ind → Case)</option>
          <option value="CO_OCCURS_IN_MESSAGE">Co-Occurs in Message (Msg → Phone)</option>
          <option value="SETTLES_TO_HANDLE">Settles to Handle (Txn → UPI)</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value="ALL">All Risk Colors</option>
          <option value="CRITICAL">Critical Risk Nodes</option>
          <option value="HIGH">High Risk Nodes</option>
          <option value="MEDIUM">Medium Risk Nodes</option>
          <option value="LOW">Low Risk Nodes</option>
        </select>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white"
        >
          <option value={45}>Display 45 Edges</option>
          <option value={65}>Display 65 Edges</option>
          <option value={110}>Display 110 Edges</option>
          <option value={160}>Display 160 Edges</option>
        </select>
      </div>

      {/* Main Graph Canvas + Right Node Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* React Flow Canvas */}
        <div className="lg:col-span-8 radar-card overflow-hidden h-[620px] relative bg-white">
          {/* Risk Color Legend */}
          <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-[11px]">
            <span className="font-bold text-[#0A2540]">Risk Legend:</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Critical
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              High
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Medium
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Low
            </span>
          </div>

          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Building entity relationship topology from database records...
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_e, node) =>
                setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
              }
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
            >
              <Background color="#CBD5E1" gap={20} />
              <Controls />
              <MiniMap
                nodeStrokeWidth={2}
                zoomable
                pannable
                className="bg-slate-50 border border-slate-200 rounded"
              />
            </ReactFlow>
          )}
        </div>

        {/* Selected Node Details Panel */}
        <div className="lg:col-span-4 radar-card p-5 flex flex-col justify-between space-y-4 h-[620px] overflow-y-auto">
          {selectedNodeData ? (
            <div className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[#0A2540] text-white">
                    {selectedNodeData.entityType}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRiskBadgeClasses(
                      selectedNodeData.riskLevel
                    )}`}
                  >
                    {selectedNodeData.riskLevel} RISK
                  </span>
                </div>
                <h3 className="text-sm font-mono font-bold text-[#0A2540] break-all pt-1">
                  {selectedNodeData.label}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Entity ID: <span className="font-mono">{selectedNodeData.id}</span> • Connected Degree:{' '}
                  <strong>{selectedNodeData.degree}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#0A2540]">
                  Corroborating Relationships ({selectedNodeEdges.length})
                </h4>
                <div className="space-y-2">
                  {selectedNodeEdges.map((edge) => (
                    <div
                      key={edge.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#635BFF]">
                          {edge.relationshipType}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {edge.id}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-[#0A2540]">
                        {edge.sourceLabel} → {edge.targetLabel}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {edge.evidenceSummary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#635BFF]" />
                <h3 className="text-sm font-bold text-[#0A2540]">
                  Graph Inspector & Node Details
                </h3>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-semibold text-[#0A2540]">
                  Click any node in the graph to highlight its connected cluster
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Selecting a node dims unrelated entities and displays every stored `EntityRelationship` edge connecting that Report, Phone, Email, Domain, UPI Handle, Transaction, or Investigation Case.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-[#0A2540]">
                  Active Graph Snapshot Summary
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded border border-slate-200 bg-white">
                    <p className="text-lg font-bold text-[#0A2540]">
                      {rawNodes.length}
                    </p>
                    <p className="text-[11px] text-slate-500">Visible Nodes</p>
                  </div>
                  <div className="p-3 rounded border border-slate-200 bg-white">
                    <p className="text-lg font-bold text-[#635BFF]">
                      {rawEdges.length}
                    </p>
                    <p className="text-[11px] text-slate-500">Visible Edges</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200/70 flex items-start gap-2 text-[11px] text-indigo-950">
                <Info className="w-4 h-4 text-[#635BFF] shrink-0 mt-0.5" />
                <span>
                  <strong>Database-Backed Integrity:</strong> All edges shown are persisted in the relational `EntityRelationship` table. No synthetic edges are invented at display time.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

