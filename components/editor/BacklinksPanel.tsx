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
    <div className="border-t border-border">
      <button
        className="flex w-full items-center gap-2 px-8 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <Link2 className="h-3.5 w-3.5" />
        <span>Backlinks</span>
        {backlinks.length > 0 && (
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
            {backlinks.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className={cn("px-8 pb-4", backlinks.length === 0 && "pb-3")}>
          {backlinks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No notes link to this one yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {backlinks.map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/notes/${note.id}`}
                    className="flex items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="truncate">{note.title}</span>
                    <span className="ml-4 shrink-0 text-xs text-muted-foreground">
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
