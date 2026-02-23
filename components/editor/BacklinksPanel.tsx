"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/format";
import { ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BacklinksPanelProps {
  noteId: string;
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const trpc = useTRPC();
  const [expanded, setExpanded] = useState(true);

  const { data: backlinks = [] } = useQuery(
    trpc.notes.backlinks.queryOptions({ noteId })
  );

  return (
    <div className="border-t border-border/40">
      <button
        className="flex w-full items-center gap-2 px-10 py-3 text-xs text-foreground/60 transition-colors hover:text-primary"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Link2 className="h-3 w-3" />
        <span className="uppercase tracking-wider">Backlinks</span>
        {backlinks.length > 0 && (
          <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
            {backlinks.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className={cn("px-10 pb-6", backlinks.length === 0 && "pb-4")}>
          {backlinks.length === 0 ? (
            <p className="text-xs italic text-foreground/50">
              No notes link to this one yet.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {backlinks.map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/notes/${note.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-primary/8 hover:text-foreground"
                  >
                    <span className="truncate text-muted-foreground hover:text-foreground">
                      {note.title}
                    </span>
                    <span className="ml-4 shrink-0 tabular-nums text-xs text-foreground/50">
                      {formatDistanceToNow(new Date(note.updatedAt))} ago
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
