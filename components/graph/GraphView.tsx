"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3-force";

interface Node {
  id: string;
  title: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
}

interface Props {
  nodes: Node[];
  links: Link[];
}

export function GraphView({ nodes, links }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  const getNodeId = (n: string | Node) => (typeof n === "string" ? n : n.id);
  const getNodePos = (n: string | Node) =>
    typeof n === "object" ? { x: n.x ?? 0, y: n.y ?? 0 } : { x: 0, y: 0 };

  const handleNodeClick = useCallback(
    (id: string) => router.push(`/notes/${id}`),
    [router]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || nodes.length === 0) return;

    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 600;

    // Deep-copy so d3 can mutate positions
    const simNodes: Node[] = nodes.map((n) => ({ ...n }));
    const idMap = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: Link[] = links.map((l) => ({
      source: idMap.get(getNodeId(l.source)) ?? getNodeId(l.source),
      target: idMap.get(getNodeId(l.target)) ?? getNodeId(l.target),
    }));

    const simulation = d3
      .forceSimulation<Node>(simNodes)
      .force("link", d3.forceLink<Node, Link>(simLinks).id((n) => n.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(30));

    // Grab live SVG elements
    const linkEls = svg.querySelectorAll<SVGLineElement>("line[data-link]");
    const nodeEls = svg.querySelectorAll<SVGGElement>("g[data-node]");

    simulation.on("tick", () => {
      linkEls.forEach((el, i) => {
        const l = simLinks[i];
        const s = getNodePos(l.source);
        const t = getNodePos(l.target);
        el.setAttribute("x1", String(s.x));
        el.setAttribute("y1", String(s.y));
        el.setAttribute("x2", String(t.x));
        el.setAttribute("y2", String(t.y));
      });
      nodeEls.forEach((el, i) => {
        el.setAttribute(
          "transform",
          `translate(${simNodes[i].x ?? 0},${simNodes[i].y ?? 0})`
        );
      });
    });

    return () => {
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, links.length]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No notes yet. Create some and link them with{" "}
        <code className="mx-1 rounded bg-muted px-1">[[Note Title]]</code> to
        see connections.
      </div>
    );
  }

  return (
    <svg ref={svgRef} className="h-full w-full" style={{ background: "#0f0f0f" }}>
      {/* Edges */}
      {links.map((l, i) => (
        <line
          key={i}
          data-link
          stroke="#3a3a3a"
          strokeWidth={1.5}
          x1={0}
          y1={0}
          x2={0}
          y2={0}
        />
      ))}

      {/* Nodes */}
      {nodes.map((node) => (
        <g
          key={node.id}
          data-node
          style={{ cursor: "pointer" }}
          onClick={() => handleNodeClick(node.id)}
        >
          <circle r={6} fill="#7c6af7" />
          <circle r={14} fill="transparent" />
          <text
            dy={22}
            textAnchor="middle"
            fontSize={11}
            fill="#a0a0a0"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {node.title.length > 20
              ? node.title.slice(0, 18) + "…"
              : node.title}
          </text>
        </g>
      ))}
    </svg>
  );
}
