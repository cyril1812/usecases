import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Search, 
  X, 
  Network, 
  Check, 
  Info 
} from 'lucide-react';

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
  const navigate = useNavigate();
  
  // Basic Canvas state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedNode, setDraggedNode] = useState<Node | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Search & Suggestions state
  const [searchText, setSearchText] = useState<string>('');
  const [searchSelectedNode, setSearchSelectedNode] = useState<Node | null>(null);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState<boolean>(false);

  // 2. Node Category Visibility filters
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(
    new Set(['disease', 'drug', 'gene', 'biomarker', 'outcome'])
  );

  // 3. Shortest Path Finder state
  const [pathStartNode, setPathStartNode] = useState<string>('');
  const [pathEndNode, setPathEndNode] = useState<string>('');
  const [pathNodes, setPathNodes] = useState<Set<string>>(new Set());
  const [pathEdges, setPathEdges] = useState<Set<string>>(new Set());
  const [pathSteps, setPathSteps] = useState<{ nodeLabel: string; edgeType: string }[]>([]);
  const [pathError, setPathError] = useState<string>('');

  // Fetch graph details from API
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
      // Initialize node coordinates randomly near center of 900x500 area
      const width = 900;
      const height = 500;
      const initializedNodes = graphData.nodes.map((node) => ({
        ...node,
        x: width / 2 + (Math.random() - 0.5) * 350,
        y: height / 2 + (Math.random() - 0.5) * 250,
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
    const width = 900;
    const height = 500;

    const tick = () => {
      // Filter nodes and edges dynamically based on active categories
      const activeNodes = nodes.filter(n => visibleTypes.has(n.type.toLowerCase()));
      const activeEdges = edges.filter(e => {
        const s = activeNodes.some(n => n.id === e.source);
        const t = activeNodes.some(n => n.id === e.target);
        return s && t;
      });

      // 1. Repulsion (charge) between all active pairs
      for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
          const n1 = activeNodes[i];
          const n2 = activeNodes[j];
          if (n1.x === undefined || n1.y === undefined || n2.x === undefined || n2.y === undefined) continue;

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
          if (dist < 350) {
            const force = (1600 / (dist * dist)); // Coulomb-like repulsion
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            n1.vx = (n1.vx || 0) - fx;
            n1.vy = (n1.vy || 0) - fy;
            n2.vx = (n2.vx || 0) + fx;
            n2.vy = (n2.vy || 0) + fy;
          }
        }
      }

      // 2. Attraction (springs) along active edges
      activeEdges.forEach((edge) => {
        const sourceNode = activeNodes.find((n) => n.id === edge.source);
        const targetNode = activeNodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) return;
        if (sourceNode.x === undefined || sourceNode.y === undefined || targetNode.x === undefined || targetNode.y === undefined) return;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
        const targetLen = 140; // Spring resting length
        const k = 0.055; // Spring constant
        const force = (dist - targetLen) * k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        sourceNode.vx = (sourceNode.vx || 0) + fx;
        sourceNode.vy = (sourceNode.vy || 0) + fy;
        targetNode.vx = (targetNode.vx || 0) - fx;
        targetNode.vy = (targetNode.vy || 0) - fy;
      });

      // 3. Gravity towards center & friction damping
      const cx = width / 2;
      const cy = height / 2;
      activeNodes.forEach((n) => {
        if (n.x === undefined || n.y === undefined) return;
        
        const g = 0.018;
        n.vx = (n.vx || 0) + (cx - n.x) * g;
        n.vy = (n.vy || 0) + (cy - n.y) * g;

        // Apply friction and update coordinates (unless dragged)
        if (n !== draggedNode) {
          n.x += n.vx || 0;
          n.y += n.vy || 0;
        }
        
        // Damping velocities
        n.vx *= 0.80;
        n.vy *= 0.80;
      });

      setNodes([...nodes]);
      drawGraph(activeNodes, activeEdges);
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [nodes, edges, draggedNode, zoom, offset, visibleTypes, selectedNode, searchSelectedNode, pathNodes, pathEdges]);

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
  const drawGraph = (activeNodes: Node[], activeEdges: Edge[]) => {
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

    // Calculate degree centrality (connections count) for sizing
    const degrees: Record<string, number> = {};
    activeNodes.forEach(node => {
      degrees[node.id] = activeEdges.filter(e => e.source === node.id || e.target === node.id).length;
    });
    const maxDegree = Math.max(...Object.values(degrees), 1);

    // 1. Draw Edges (lines)
    activeEdges.forEach((edge) => {
      const s = activeNodes.find((n) => n.id === edge.source);
      const t = activeNodes.find((n) => n.id === edge.target);
      if (!s || !t || s.x === undefined || s.y === undefined || t.x === undefined || t.y === undefined) return;

      const isPathEdge = pathEdges.has(edge.id);
      const hasActivePath = pathEdges.size > 0;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);

      if (hasActivePath) {
        ctx.strokeStyle = isPathEdge ? 'rgba(56, 189, 248, 0.95)' : 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = isPathEdge ? 4.0 : 1.0;
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.8;
      }
      ctx.stroke();

      // Draw relationship label at midpoint
      const mx = (s.x + t.x) / 2;
      const my = (s.y + t.y) / 2;
      ctx.font = isPathEdge ? 'bold 9px sans-serif' : '8px sans-serif';
      
      if (hasActivePath) {
        ctx.fillStyle = isPathEdge ? 'rgba(56, 189, 248, 1.0)' : 'rgba(255, 255, 255, 0.15)';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      }
      ctx.textAlign = 'center';
      ctx.fillText(edge.type, mx, my - 4);
    });

    // 2. Draw Nodes (circles)
    activeNodes.forEach((node) => {
      if (node.x === undefined || node.y === undefined) return;

      const colors = getTypeColor(node.type);
      const isSelected = selectedNode?.id === node.id;
      const isSearched = searchSelectedNode?.id === node.id;
      const isPathNode = pathNodes.has(node.id);
      const hasActivePath = pathNodes.size > 0;

      // Calculate radius dynamically based on degree centrality (12px to 22px)
      const degree = degrees[node.id] || 0;
      const centralityScale = degree / maxDegree;
      const baseRadius = 12 + centralityScale * 10;
      const radius = isSelected || isSearched ? baseRadius + 4 : baseRadius;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      
      if (hasActivePath) {
        ctx.fillStyle = isPathNode ? colors.fill : 'rgba(30, 41, 59, 0.3)';
        ctx.lineWidth = isPathNode ? (isSelected || isSearched ? 4 : 2.5) : 1.0;
        ctx.strokeStyle = isPathNode 
          ? (isSelected || isSearched ? '#ffffff' : 'rgba(56, 189, 248, 0.95)')
          : 'rgba(255, 255, 255, 0.05)';
      } else {
        ctx.fillStyle = colors.fill;
        ctx.lineWidth = isSelected || isSearched ? 3 : 1.5;
        ctx.strokeStyle = isSelected || isSearched ? '#ffffff' : colors.border;
      }
      
      // Node glow shadow when selected or searched
      if (isSearched || isSelected) {
        ctx.shadowColor = colors.fill;
        ctx.shadowBlur = 20;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Draw node text label
      ctx.font = isSelected || isSearched ? 'bold 11px sans-serif' : '10px sans-serif';
      if (hasActivePath) {
        ctx.fillStyle = isPathNode ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
      } else {
        ctx.fillStyle = isSelected || isSearched ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
      }
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + radius + 13);
    });

    ctx.restore();
  };

  // Convert viewport position to canvas coords
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const virtualX = (x - canvas.width / 2 - offset.x) / zoom + canvas.width / 2;
    const virtualY = (y - canvas.height / 2 - offset.y) / zoom + canvas.height / 2;
    
    return { x: virtualX, y: virtualY };
  };

  // Mouse drag-and-drop handles
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasCoords = getCanvasCoords(e.clientX, e.clientY);
    const activeNodes = nodes.filter(n => visibleTypes.has(n.type.toLowerCase()));
    
    // Compute degree centrality to match click hit-radius to actual rendered size
    const degrees: Record<string, number> = {};
    activeNodes.forEach(node => {
      degrees[node.id] = edges.filter(ed => {
        const s = activeNodes.some(n => n.id === ed.source);
        const t = activeNodes.some(n => n.id === ed.target);
        return (ed.source === node.id || ed.target === node.id) && s && t;
      }).length;
    });
    const maxDegree = Math.max(...Object.values(degrees), 1);

    const clicked = activeNodes.find((node) => {
      if (node.x === undefined || node.y === undefined) return false;
      const dx = node.x - canvasCoords.x;
      const dy = node.y - canvasCoords.y;
      
      const degree = degrees[node.id] || 0;
      const centralityScale = degree / maxDegree;
      const radius = 12 + centralityScale * 10;
      const activeRadius = selectedNode?.id === node.id || searchSelectedNode?.id === node.id ? radius + 4 : radius;

      return Math.sqrt(dx * dx + dy * dy) < (activeRadius + 6);
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

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasCoords = getCanvasCoords(e.clientX, e.clientY);
    const activeNodes = nodes.filter(n => visibleTypes.has(n.type.toLowerCase()));
    const clicked = activeNodes.find((node) => {
      if (node.x === undefined || node.y === undefined) return false;
      const dx = node.x - canvasCoords.x;
      const dy = node.y - canvasCoords.y;
      return Math.sqrt(dx * dx + dy * dy) < 25;
    });

    if (clicked) {
      navigator.clipboard.writeText(clicked.label);
      if (clicked.type.toLowerCase() === 'disease' || clicked.type.toLowerCase() === 'outcome') {
        navigate('/clinical', { state: { initialQuery: clicked.label } });
      } else {
        navigate('/workspace', { state: { initialQuery: clicked.label } });
      }
    }
  };

  // Center view camera onto a specific node
  const focusOnNode = (node: Node) => {
    if (node.x === undefined || node.y === undefined) return;
    const newZoom = 1.3;
    setZoom(newZoom);
    setOffset({
      x: - (node.x - 900 / 2) * newZoom,
      y: - (node.y - 500 / 2) * newZoom
    });
    setSelectedNode(node);
  };

  // Search autocomplete actions
  const handleSearchSelect = (node: Node) => {
    const typeLower = node.type.toLowerCase();
    if (!visibleTypes.has(typeLower)) {
      setVisibleTypes(prev => {
        const next = new Set(prev);
        next.add(typeLower);
        return next;
      });
    }
    setSearchSelectedNode(node);
    setSearchText(node.label);
    setShowSearchSuggestions(false);
    focusOnNode(node);
  };

  const handleClearSearch = () => {
    setSearchText('');
    setSearchSelectedNode(null);
    setShowSearchSuggestions(false);
  };

  // BFS Undirected Shortest Path Finder
  const findPath = (startId: string, endId: string) => {
    if (!startId || !endId) return { nodes: new Set<string>(), edges: new Set<string>() };
    if (startId === endId) return { nodes: new Set<string>([startId]), edges: new Set<string>() };

    const queue: string[] = [startId];
    const visited = new Set<string>([startId]);
    const parent: Record<string, { nodeId: string; edgeId: string }> = {};

    let found = false;
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === endId) {
        found = true;
        break;
      }

      const currentEdges = edges.filter(e => e.source === current || e.target === current);
      for (const edge of currentEdges) {
        const neighbor = edge.source === current ? edge.target : edge.source;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent[neighbor] = { nodeId: current, edgeId: edge.id };
          queue.push(neighbor);
        }
      }
    }

    if (!found) return { nodes: new Set<string>(), edges: new Set<string>() };

    const pathNodes = new Set<string>([endId]);
    const pathEdges = new Set<string>();
    let curr = endId;
    while (curr !== startId) {
      const p = parent[curr];
      if (!p) break;
      pathNodes.add(p.nodeId);
      pathEdges.add(p.edgeId);
      curr = p.nodeId;
    }

    return { nodes: pathNodes, edges: pathEdges };
  };

  const handleFindPath = () => {
    setPathError('');
    if (!pathStartNode || !pathEndNode) {
      setPathError('Please select both start and end nodes.');
      return;
    }
    if (pathStartNode === pathEndNode) {
      setPathError('Start and end nodes must be different.');
      return;
    }

    const { nodes: pNodes, edges: pEdges } = findPath(pathStartNode, pathEndNode);
    
    if (pNodes.size === 0) {
      setPathError('No pathway found between these nodes.');
      setPathNodes(new Set());
      setPathEdges(new Set());
      setPathSteps([]);
      return;
    }

    // Force enable the types of path nodes to make them visible
    nodes.forEach(node => {
      if (pNodes.has(node.id)) {
        setVisibleTypes(prev => {
          const next = new Set(prev);
          next.add(node.type.toLowerCase());
          return next;
        });
      }
    });

    setPathNodes(pNodes);
    setPathEdges(pEdges);

    // Build step-by-step description array
    const queue = [pathStartNode];
    const visited = new Set([pathStartNode]);
    const traceParent: Record<string, { nodeId: string; edgeType: string }> = {};
    let found = false;

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === pathEndNode) {
        found = true;
        break;
      }
      const currentEdges = edges.filter(e => e.source === current || e.target === current);
      for (const edge of currentEdges) {
        const neighbor = edge.source === current ? edge.target : edge.source;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          traceParent[neighbor] = { nodeId: current, edgeType: edge.type };
          queue.push(neighbor);
        }
      }
    }

    const steps = [];
    let curr = pathEndNode;
    while (curr !== pathStartNode) {
      const p = traceParent[curr];
      if (!p) break;
      const nodeObj = nodes.find(n => n.id === curr);
      steps.unshift({
        nodeLabel: nodeObj?.label || curr,
        edgeType: p.edgeType
      });
      curr = p.nodeId;
    }
    setPathSteps(steps);
  };

  const handleClearPath = () => {
    setPathStartNode('');
    setPathEndNode('');
    setPathNodes(new Set());
    setPathEdges(new Set());
    setPathSteps([]);
    setPathError('');
  };

  // Reset all layout settings
  const handleResetLayout = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelectedNode(null);
    handleClearSearch();
    handleClearPath();
    setVisibleTypes(new Set(['disease', 'drug', 'gene', 'biomarker', 'outcome']));
    refetch();
  };

  // Toggle filter types
  const handleTypeToggle = (type: string) => {
    setVisibleTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Prevent clearing all types
        if (next.size > 1) {
          next.delete(type);
        }
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Filter list of nodes matching autocomplete queries
  const searchableNodes = nodes.filter(n => 
    n.label.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* 1. Visualizer Column */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Canvas Toolbar Controls */}
        <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--primary-glow)] p-2 rounded-lg text-[var(--primary)] border border-[var(--border-glow)]">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-white">
                Interactive Graph Visualizer
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Drag to organize nodes. Use scrollwheel or buttons to zoom.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setZoom(prev => Math.min(prev + 0.1, 2.5))}
              className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-gray-500 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.4))}
              className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-gray-500 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button 
              onClick={handleResetLayout}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-gray-500 flex items-center gap-1.5 text-[var(--text-muted)] hover:text-white transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Reset View
            </button>
          </div>
        </div>

        {/* The Graph Canvas Wrapper */}
        <div className="relative border border-[var(--border-light)] rounded-xl overflow-hidden bg-[var(--bg-sidebar)] h-[500px]">
          <canvas
            ref={canvasRef}
            width={900}
            height={500}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />

          {/* Floating Canvas Overlays */}
          {pathSteps.length > 0 && (
            <div className="absolute bottom-4 left-4 max-w-sm glass-panel p-4 border border-sky-500/30 bg-[var(--bg-main)]/95 shadow-lg slide-in">
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex w-fit items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Active Relationship Pathway
              </span>
              <div className="mt-3 flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                <div className="text-xs text-white font-semibold flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-light)] flex items-center justify-center text-[9px] text-[var(--text-muted)]">1</span>
                  {nodes.find(n => n.id === pathStartNode)?.label}
                </div>
                {pathSteps.map((step, idx) => (
                  <div key={idx} className="flex flex-col gap-1 pl-4 border-l border-sky-500/30">
                    <span className="text-[10px] text-sky-400 italic">
                      ↳ {step.edgeType}
                    </span>
                    <span className="text-xs text-white font-semibold flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-light)] flex items-center justify-center text-[9px] text-[var(--text-muted)]">{idx + 2}</span>
                      {step.nodeLabel}
                    </span>
                  </div>
                ))}
              </div>
              <button 
                onClick={handleClearPath}
                className="mt-3 text-[10px] font-semibold text-sky-400 hover:underline"
              >
                Clear Pathway Highlight
              </button>
            </div>
          )}
        </div>

        {/* 2. Interactive Filter Chips in Footer */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            Toggle Node Category Filters
          </span>
          <div className="flex flex-wrap gap-2.5">
            {[
              { type: 'disease', label: 'Diseases', color: 'hsl(350, 80%, 60%)' },
              { type: 'drug', label: 'Drugs', color: 'hsl(190, 95%, 45%)' },
              { type: 'gene', label: 'Genes', color: 'hsl(270, 95%, 65%)' },
              { type: 'biomarker', label: 'Biomarkers', color: 'hsl(315, 90%, 55%)' },
              { type: 'outcome', label: 'Outcomes', color: 'hsl(145, 80%, 50%)' }
            ].map(chip => {
              const active = visibleTypes.has(chip.type);
              return (
                <button
                  key={chip.type}
                  onClick={() => handleTypeToggle(chip.type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border transition-all ${
                    active 
                      ? 'text-white border-transparent' 
                      : 'bg-transparent text-[var(--text-dim)] border-[var(--border-light)] hover:text-white'
                  }`}
                  style={{
                    backgroundColor: active ? chip.color : undefined,
                    boxShadow: active ? `0 4px 12px -3px ${chip.color}` : undefined
                  }}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full border border-white/20" 
                    style={{ backgroundColor: active ? 'white' : chip.color }} 
                  />
                  {chip.label}
                  {active && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Graph Control Sidebar Panel */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Search Panel */}
        <div className="glass-panel p-4 flex flex-col gap-3 relative">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-[var(--primary)]" />
            Search and Locate Node
          </h4>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Type node name (e.g. Pembrolizumab)" 
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-light)] rounded-lg py-2 pl-3 pr-8 text-xs text-white placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
            {searchText ? (
              <button 
                onClick={handleClearSearch}
                className="absolute right-2 top-2.5 text-[var(--text-dim)] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[var(--text-dim)]" />
            )}
            
            {/* Search Suggestions Dropdown */}
            {showSearchSuggestions && searchText && (
              <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto glass-panel z-20 border border-[var(--border-medium)] bg-[var(--bg-main)]/95 shadow-xl py-1">
                {searchableNodes.length > 0 ? (
                  searchableNodes.map(node => (
                    <button
                      key={node.id}
                      onClick={() => handleSearchSelect(node)}
                      className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)] transition-colors flex items-center justify-between"
                    >
                      <span>{node.label}</span>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--text-dim)] px-1.5 py-0.5 rounded bg-[var(--border-light)]">
                        {node.type}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-[var(--text-dim)]">
                    No matching clinical entities found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Path Finder Panel */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            Relationship Path Finder
          </h4>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Find the shortest connecting pathway of clinical relationships between two entities.
          </p>

          <div className="flex flex-col gap-2 mt-1">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[var(--text-dim)] uppercase">Start Entity</label>
              <select
                value={pathStartNode}
                onChange={(e) => setPathStartNode(e.target.value)}
                className="bg-[var(--bg-sidebar)] border border-[var(--border-light)] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">Select starting entity...</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[var(--text-dim)] uppercase">End Entity</label>
              <select
                value={pathEndNode}
                onChange={(e) => setPathEndNode(e.target.value)}
                className="bg-[var(--bg-sidebar)] border border-[var(--border-light)] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">Select target entity...</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                ))}
              </select>
            </div>

            {pathError && (
              <span className="text-[10px] text-rose-400 mt-1 leading-snug">
                {pathError}
              </span>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleFindPath}
                className="flex-1 py-1.5 rounded-lg bg-sky-500 text-xs font-bold text-white hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/10"
              >
                Find Path
              </button>
              {(pathNodes.size > 0 || pathError) && (
                <button
                  onClick={handleClearPath}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-gray-500 text-xs text-[var(--text-muted)] hover:text-white transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Entity Explorer */}
        {selectedNode ? (
          <div className="glass-panel p-4 border border-[var(--primary)]/40 bg-[var(--bg-sidebar)]/50 flex flex-col gap-3 slide-in">
            <div className="flex items-start justify-between border-b border-[var(--border-light)] pb-2.5">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--primary-glow)] text-[var(--primary)] border border-[var(--border-glow)]">
                  {selectedNode.type}
                </span>
                <h4 className="text-sm font-bold text-white mt-1.5">
                  {selectedNode.label}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-[var(--text-dim)] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate('/workspace', { state: { initialQuery: selectedNode.label } })}
                className="flex-1 py-1.5 rounded-lg bg-[var(--primary-glow)] border border-[var(--border-glow)] hover:bg-[var(--primary)]/20 text-xs font-bold text-[var(--primary)] transition-all flex items-center justify-center gap-1.5"
              >
                Search Chat
              </button>
              <button
                onClick={() => navigate('/clinical', { state: { initialQuery: selectedNode.label } })}
                className="flex-1 py-1.5 rounded-lg bg-white/5 border border-[var(--border-light)] hover:border-gray-500 text-xs font-bold text-[var(--text-muted)] hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                Search Trials
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Local Relationships ({edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length})
              </span>
              
              <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map(edge => {
                  const isSource = edge.source === selectedNode.id;
                  const targetId = isSource ? edge.target : edge.source;
                  const targetNode = nodes.find(n => n.id === targetId);
                  
                  return (
                    <div 
                      key={edge.id} 
                      className="text-[11px] py-1.5 px-2 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-md flex flex-wrap items-center justify-between gap-1 hover:border-[var(--primary)] transition-colors cursor-pointer"
                      onClick={() => targetNode && focusOnNode(targetNode)}
                      title={`Click to focus on ${targetNode?.label}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1 h-3 rounded-full ${isSource ? 'bg-[var(--primary)]' : 'bg-purple-500'}`} />
                        <span className="text-[var(--text-dim)] text-[10px]">
                          {isSource ? 'Outbound' : 'Inbound'}
                        </span>
                      </div>
                      <span className="font-bold text-[var(--text-muted)] text-[9px] uppercase px-1 py-0.2 rounded bg-white/5">
                        {edge.type}
                      </span>
                      <span className="font-semibold text-white hover:text-[var(--primary)] transition-colors">
                        {targetNode?.label || targetId}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-5 border-dashed border-[var(--border-light)] text-center flex flex-col items-center gap-2">
            <Info className="w-6 h-6 text-[var(--text-dim)]" />
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Click a node on the canvas, locate it via search, or find path relations to explore its detailed medical connections.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
