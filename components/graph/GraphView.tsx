"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

// react-force-graph uses browser APIs — must be loaded client-side only
const ForceGraph2D = dynamic(() => import("react-force-graph").then((m) => m.ForceGraph2D), {
  ssr: false,
});

interface Node {
  id: string;
  title: string;
}

interface Link {
  source: string;
  target: string;
}

interface Props {
  nodes: Node[];
  links: Link[];
}

export function GraphView({ nodes, links }: Props) {
  const router = useRouter();

  const handleNodeClick = useCallback(
    (node: { id?: string | number }) => {
      if (node.id) router.push(`/notes/${node.id}`);
    },
    [router]
  );

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No notes yet. Create some notes and link them with{" "}
        <code className="mx-1 rounded bg-muted px-1">[[double brackets]]</code> to see the graph.
      </div>
    );
  }

  return (
    <ForceGraph2D
      graphData={{ nodes, links }}
      nodeId="id"
      nodeLabel="title"
      nodeRelSize={6}
      nodeColor={() => "#7c6af7"}
      linkColor={() => "#2a2a2a"}
      linkWidth={1.5}
      backgroundColor="#0f0f0f"
      onNodeClick={handleNodeClick}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const label = (node as Node & { x?: number; y?: number }).title;
        const fontSize = Math.max(10 / globalScale, 3);
        const x = (node as { x?: number }).x ?? 0;
        const y = (node as { y?: number }).y ?? 0;

        // Draw node circle
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#7c6af7";
        ctx.fill();

        // Draw label below node
        if (globalScale >= 0.8) {
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = "#e8e8e8";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(label.length > 24 ? label.slice(0, 22) + "…" : label, x, y + 7);
        }
      }}
      cooldownTicks={100}
    />
  );
}
