"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useRouter } from "next/navigation";

export function WikiLinkNodeView({ node }: NodeViewProps) {
  const router = useRouter();
  const { noteId, title } = node.attrs;

  return (
    <NodeViewWrapper as="span">
      <span
        className="inline-block cursor-pointer rounded bg-primary/10 px-1 text-primary hover:bg-primary/20"
        onClick={() => router.push(`/notes/${noteId}`)}
      >
        [[{title}]]
      </span>
    </NodeViewWrapper>
  );
}
