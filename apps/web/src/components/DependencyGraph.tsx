import { useMemo, useCallback, useState } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DependencyGraphResult, DependencyNode as DependencyNodeType } from '@react-codebase-xray/shared';

interface DependencyGraphProps {
    result: DependencyGraphResult;
}

const NODE_COLORS: Record<string, { bg: string; border: string }> = {
    component: { bg: '#1e40af', border: '#3b82f6' },
    hook: { bg: '#7c3aed', border: '#a78bfa' },
    page: { bg: '#059669', border: '#34d399' },
    layout: { bg: '#0891b2', border: '#22d3ee' },
    util: { bg: '#ca8a04', border: '#facc15' },
    api: { bg: '#dc2626', border: '#f87171' },
    config: { bg: '#64748b', border: '#94a3b8' },
    test: { bg: '#4b5563', border: '#9ca3af' },
    unknown: { bg: '#374151', border: '#6b7280' },
};

export function DependencyGraph({ result }: DependencyGraphProps) {
    const [selectedNode, setSelectedNode] = useState<DependencyNodeType | null>(null);
    const [showCircularOnly, setShowCircularOnly] = useState(false);

    const { initialNodes, initialEdges } = useMemo(() => {
        let filteredNodes = result.nodes;
        let filteredEdges = result.edges;

        if (showCircularOnly) {
            const circularIds = new Set(
                result.circularDependencies.flatMap(cd => cd.chain)
            );
            filteredNodes = result.nodes.filter(n => circularIds.has(n.id));
            filteredEdges = result.edges.filter(
                e => circularIds.has(e.source) && circularIds.has(e.target)
            );
        }

        // Limit nodes for performance
        const maxNodes = 200;
        if (filteredNodes.length > maxNodes) {
            // Prioritize circular and high-dependency nodes
            filteredNodes = filteredNodes
                .sort((a, b) => {
                    if (a.isCircular !== b.isCircular) return a.isCircular ? -1 : 1;
                    return (b.dependencyCount + b.dependentCount) - (a.dependencyCount + a.dependentCount);
                })
                .slice(0, maxNodes);

            const nodeIds = new Set(filteredNodes.map(n => n.id));
            filteredEdges = result.edges.filter(
                e => nodeIds.has(e.source) && nodeIds.has(e.target)
            );
        }

        // Create a grid layout
        const columns = Math.ceil(Math.sqrt(filteredNodes.length));
        const nodeWidth = 180;
        const nodeHeight = 60;
        const horizontalSpacing = 250;
        const verticalSpacing = 100;

        const nodes: Node[] = filteredNodes.map((node, index) => {
            const colors = NODE_COLORS[node.type] || NODE_COLORS.unknown;
            const col = index % columns;
            const row = Math.floor(index / columns);

            return {
                id: node.id,
                position: {
                    x: col * horizontalSpacing,
                    y: row * verticalSpacing,
                },
                data: {
                    label: node.label,
                    fullData: node,
                },
                style: {
                    background: colors.bg,
                    border: `2px solid ${node.isCircular ? '#f59e0b' : colors.border}`,
                    borderRadius: '8px',
                    padding: '12px',
                    width: nodeWidth,
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: node.isCircular ? '0 0 12px rgba(245, 158, 11, 0.5)' : 'none',
                },
            };
        });

        const edges: Edge[] = filteredEdges.map((edge, index) => ({
            id: `e-${edge.source}-${edge.target}-${index}`,
            source: edge.source,
            target: edge.target,
            style: {
                stroke: edge.isCircular ? '#f59e0b' : '#475569',
                strokeWidth: edge.isCircular ? 2 : 1,
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: edge.isCircular ? '#f59e0b' : '#475569',
            },
            animated: edge.isCircular,
        }));

        return { initialNodes: nodes, initialEdges: edges };
    }, [result, showCircularOnly]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        setSelectedNode(node.data.fullData as DependencyNodeType);
    }, []);

    return (
        <div className="h-[600px] relative">
            {/* Controls bar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <button
                    onClick={() => setShowCircularOnly(!showCircularOnly)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${showCircularOnly
                            ? 'bg-yellow-500 text-white'
                            : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                        }`}
                >
                    {showCircularOnly ? 'Show All' : `Show Circular (${result.circularDependencies.length})`}
                </button>
            </div>

            {/* Stats bar */}
            <div className="absolute top-4 right-4 z-10 flex gap-4 bg-surface-800/90 rounded-lg px-4 py-2 text-sm">
                <div>
                    <span className="text-surface-400">Nodes: </span>
                    <span className="text-white font-medium">{nodes.length}</span>
                </div>
                <div>
                    <span className="text-surface-400">Edges: </span>
                    <span className="text-white font-medium">{edges.length}</span>
                </div>
                <div>
                    <span className="text-surface-400">Circular: </span>
                    <span className="text-yellow-400 font-medium">{result.circularDependencies.length}</span>
                </div>
            </div>

            {/* Graph */}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                minZoom={0.1}
                maxZoom={2}
            >
                <Controls className="!bg-surface-800 !border-surface-700" />
                <MiniMap
                    nodeColor={(node) => {
                        const data = node.data?.fullData as DependencyNodeType | undefined;
                        const type = data?.type || 'unknown';
                        return NODE_COLORS[type]?.bg || NODE_COLORS.unknown.bg;
                    }}
                    className="!bg-surface-800"
                />
                <Background color="#334155" gap={20} />
            </ReactFlow>

            {/* Node details panel */}
            {selectedNode && (
                <div className="absolute bottom-4 left-4 right-4 z-10 bg-surface-800/95 rounded-xl p-4 backdrop-blur-sm border border-surface-700">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-lg">{selectedNode.label}</h4>
                            <p className="text-surface-400 text-sm font-mono">{selectedNode.id}</p>
                        </div>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="p-1 hover:bg-surface-700 rounded"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                            <span className="text-surface-400 text-sm">Type</span>
                            <p className="font-medium capitalize">{selectedNode.type}</p>
                        </div>
                        <div>
                            <span className="text-surface-400 text-sm">Dependencies</span>
                            <p className="font-medium">{selectedNode.dependencyCount}</p>
                        </div>
                        <div>
                            <span className="text-surface-400 text-sm">Dependents</span>
                            <p className="font-medium">{selectedNode.dependentCount}</p>
                        </div>
                        <div>
                            <span className="text-surface-400 text-sm">Lines</span>
                            <p className="font-medium">{selectedNode.linesOfCode}</p>
                        </div>
                    </div>

                    {selectedNode.isCircular && (
                        <div className="mt-4 px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm">
                            ⚠️ This module is part of a circular dependency chain
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 right-4 z-10 bg-surface-800/90 rounded-lg p-3 text-xs">
                <p className="text-surface-400 mb-2 font-medium">Module Types</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(NODE_COLORS).slice(0, 8).map(([type, colors]) => (
                        <div key={type} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                            />
                            <span className="capitalize text-surface-300">{type}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
