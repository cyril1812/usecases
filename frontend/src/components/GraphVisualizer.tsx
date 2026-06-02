import React, { useRef, useEffect, useState } from 'react';
import { useResearchStore } from '../store/researchStore';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export default function GraphVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { token } = useAuthStore();
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedNode, setDraggedNode] = useState<Node | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fetch graph details
  const { data: graphData, refetch, isFetching } = useQuery({
    queryKey: ['graphData'],
    queryFn: async () => {
      const res = await fetch('/api/graph', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Graph fetch failed');
      return res.json() as Promise<{ nodes: Node[]; edges: Edge[] }>;
    },
    enabled: !!token
  });

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (graphData) {
      // Initialize node coordinates randomly near center
      const width = 800;
      const height = 400;
      const initializedNodes = graphData.nodes.map((node) => ({
        ...node,
        x: width / 2 + (Math.random() - 0.5) * 300,
        y: height / 2 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0
      }));
      setNodes(initializedNodes);
      setEdges(graphData.edges);
    }
  }, [graphData]);

  // Force-directed layout simulation loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationId: number;
    const width = 800;
    const height = 400;

    const tick = () => {
      // 1. Force calculations
      // Repulsion (charge) between all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          if (n1.x === undefined || n1.y === undefined || n2.x === undefined || n2.y === undefined) continue;

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
          if (dist < 350) {
            const force = (1200 / (dist * dist)); // Coulomb-like repulsion
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            n1.vx = (n1.vx || 0) - fx;
            n1.vy = (n1.vy || 0) - fy;
            n2.vx = (n2.vx || 0) + fx;
            n2.vy = (n2.vy || 0) + fy;
          }
        }
      }

      // Attraction (springs) along edges
      edges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) return;
        if (sourceNode.x === undefined || sourceNode.y === undefined || targetNode.x === undefined || targetNode.y === undefined) return;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
        const targetLen = 140; // Spring resting length
        const k = 0.05; // Spring constant
        const force = (dist - targetLen) * k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        sourceNode.vx = (sourceNode.vx || 0) + fx;
        sourceNode.vy = (sourceNode.vy || 0) + fy;
        targetNode.vx = (targetNode.vx || 0) - fx;
        targetNode.vy = (targetNode.vy || 0) - fy;
      });

      // Gravity towards center & friction damping
      const cx = width / 2;
      const cy = height / 2;
      nodes.forEach((n) => {
        if (n.x === undefined || n.y === undefined) return;
        
        // Gravity force
        const g = 0.015;
        n.vx = (n.vx || 0) + (cx - n.x) * g;
        n.vy = (n.vy || 0) + (cy - n.y) * g;

        // Apply friction and update coordinates (unless dragged)
        if (n !== draggedNode) {
          n.x += n.vx || 0;
          n.y += n.vy || 0;
        }
        
        // Damping velocities
        n.vx *= 0.82;
        n.vy *= 0.82;
      });

      setNodes([...nodes]);
      drawGraph();
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [nodes, edges, draggedNode, zoom, offset]);

  // Color mapper by entity type
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'disease': return { fill: 'hsl(350, 80%, 60%)', border: 'hsl(350, 85%, 45%)' };
      case 'drug': return { fill: 'hsl(190, 95%, 45%)', border: 'hsl(195, 95%, 35%)' };
      case 'gene': return { fill: 'hsl(270, 95%, 65%)', border: 'hsl(270, 95%, 50%)' };
      case 'biomarker': return { fill: 'hsl(315, 90%, 55%)', border: 'hsl(315, 90%, 40%)' };
      case 'outcome': return { fill: 'hsl(145, 80%, 50%)', border: 'hsl(145, 85%, 35%)' };
      default: return { fill: 'hsl(210, 15%, 60%)', border: 'hsl(210, 10%, 45%)' };
    }
  };

  // Canvas drawing logic
  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Zoom & Pan translation
    ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw Edges (lines)
    edges.forEach((edge) => {
      const s = nodes.find((n) => n.id === edge.source);
      const t = nodes.find((n) => n.id === edge.target);
      if (!s || !t || s.x === undefined || s.y === undefined || t.x === undefined || t.y === undefined) return;

      // Draw relationship line
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Draw edge type label mid-point
      const mx = (s.x + t.x) / 2;
      const my = (s.y + t.y) / 2;
      ctx.font = '8px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText(edge.type, mx, my - 4);
    });

    // Draw Nodes (circles)
    nodes.forEach((node) => {
      if (node.x === undefined || node.y === undefined) return;

      const colors = getTypeColor(node.type);
      const isSelected = selectedNode?.id === node.id;

      ctx.beginPath();
      ctx.arc(node.x, node.y, isSelected ? 18 : 12, 0, 2 * Math.PI);
      
      // Node fill & shadow glow
      ctx.fillStyle = colors.fill;
      ctx.fill();
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = isSelected ? '#ffffff' : colors.border;
      ctx.stroke();

      // Node Label
      ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + (isSelected ? 32 : 25));
    });

    ctx.restore();
  };

  // Convert client viewport mouse position to canvas virtual coordinates (accounting for zoom/pan)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Reverse zoom and offsets
    const virtualX = (x - canvas.width / 2 - offset.x) / zoom + canvas.width / 2;
    const virtualY = (y - canvas.height / 2 - offset.y) / zoom + canvas.height / 2;
    
    return { x: virtualX, y: virtualY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasCoords = getCanvasCoords(e.clientX, e.clientY);
    
    // Check if clicked a node
    const clicked = nodes.find((node) => {
      if (node.x === undefined || node.y === undefined) return false;
      const dx = node.x - canvasCoords.x;
      const dy = node.y - canvasCoords.y;
      return Math.sqrt(dx * dx + dy * dy) < 25; // hit radius
    });

    if (clicked) {
      setDraggedNode(clicked);
      setSelectedNode(clicked);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNode && draggedNode.x !== undefined && draggedNode.y !== undefined) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      draggedNode.x = coords.x;
      draggedNode.y = coords.y;
    } else if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsDragging(false);
  };

  const handleResetLayout = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelectedNode(null);
    refetch();
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
        <div>
          <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)]">
            Medical Knowledge Graph
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Interactive visualization of extracted clinical relationships
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setZoom(prev => Math.min(prev + 0.1, 2.5))}
            className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-gray-500 flex items-center justify-center text-[var(--text-muted)] hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.4))}
            className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-gray-500 flex items-center justify-center text-[var(--text-muted)] hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button 
            onClick={handleResetLayout}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-gray-500 flex items-center gap-1.5 text-[var(--text-muted)] hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Reset
          </button>
        </div>
      </div>

      <div className="relative border border-[var(--border-light)] rounded-xl overflow-hidden bg-[var(--bg-sidebar)] h-[400px]">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {selectedNode && (
          <div className="absolute top-4 left-4 max-w-xs glass-panel p-4 border border-[var(--primary)] slide-in bg-[var(--bg-main)]/90">
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--primary-glow)] text-[var(--primary)]">
              {selectedNode.type}
            </span>
            <h4 className="text-sm font-bold text-[var(--text-main)] mt-2">
              {selectedNode.label}
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Double click relationship lines or nodes to filter research workspaces or view related studies in active library.
            </p>
            <button 
              onClick={() => setSelectedNode(null)}
              className="mt-3 text-[10px] font-semibold text-[var(--primary)] hover:underline"
            >
              Close Explorer Panel
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 justify-center text-xs mt-1 border-t border-[var(--border-light)] pt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[hsl(350,80%,60%)]" />
          <span className="text-[var(--text-muted)]">Diseases</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[hsl(190,95%,45%)]" />
          <span className="text-[var(--text-muted)]">Drugs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[hsl(270,95%,65%)]" />
          <span className="text-[var(--text-muted)]">Genes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[hsl(315,90%,55%)]" />
          <span className="text-[var(--text-muted)]">Biomarkers</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[hsl(145,80%,50%)]" />
          <span className="text-[var(--text-muted)]">Outcomes</span>
        </div>
      </div>
    </div>
  );
}
