"use client";

import { use, useState, useCallback, useRef } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Editor } from "@/components/editor/Editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/format";
import { Star, Archive, Trash2, Pin, Download, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BacklinksPanel } from "@/components/editor/BacklinksPanel";
import { VersionHistoryDialog } from "@/components/editor/VersionHistoryDialog";
import { AISuggestTags } from "@/components/editor/AISuggestTags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TurndownService from "turndown";

export default function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const titleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  const { data: note, isLoading } = useQuery(trpc.notes.get.queryOptions({ id }));

  const updateNote = useMutation(
    trpc.notes.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.notes.get.queryOptions({ id }));
        queryClient.invalidateQueries(trpc.notes.recents.queryOptions());
        queryClient.invalidateQueries(trpc.notes.list.queryOptions({ folderId: note?.folderId ?? undefined }));
        queryClient.invalidateQueries(trpc.notes.list.queryOptions({ isFavorite: true }));
      },
      onError: () => toast.error("Failed to update note"),
    })
  );

  const deleteNote = useMutation(
    trpc.notes.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.notes.recents.queryOptions());
        router.push("/notes");
        toast.success("Note deleted");
      },
      onError: () => toast.error("Failed to delete note"),
    })
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      if (titleTimeout.current) clearTimeout(titleTimeout.current);
      titleTimeout.current = setTimeout(() => {
        updateNote.mutate({ id, title: newTitle });
      }, 800);
    },
    [id, updateNote]
  );

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-5 px-10 py-10">
        <Skeleton className="h-10 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-36 rounded" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/6 rounded" />
          <Skeleton className="h-4 w-full rounded" />
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Note not found
      </div>
    );
  }

  const displayTitle = title ?? note.title;
  const noteContent = note.content;

  function exportMarkdown() {
    const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
    const markdown = `# ${displayTitle}\n\n${td.turndown(noteContent)}`;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${displayTitle || "Untitled"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const safeTitle = displayTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 2rem; color: #111; line-height: 1.6; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    h2, h3 { margin-top: 1.5rem; }
    code { background: #f4f4f4; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #555; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f4f4f4; font-weight: 600; }
    img { max-width: 100%; }
    a { color: #6366f1; }
  </style>
</head><body>
  <h1>${safeTitle}</h1>
  ${noteContent}
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) { toast.error("Pop-up blocked — allow pop-ups and try again"); URL.revokeObjectURL(url); return; }
    w.addEventListener("load", () => { w.print(); URL.revokeObjectURL(url); }, { once: true });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Note meta bar */}
      <div className="flex items-center justify-between border-b border-border/40 px-8 py-2">
        <div className="flex items-center gap-2 text-xs text-foreground/70">
          <span className="tabular-nums">
            {formatDistanceToNow(new Date(note.updatedAt))} ago
          </span>
          {note.tags.length > 0 && (
            <>
              <span className="opacity-40">·</span>
              <div className="flex gap-1">
                {note.tags.map(({ tag }) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="rounded-full px-2 py-0 text-xs font-normal"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </>
          )}
          <AISuggestTags noteId={id} />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 transition-colors",
              note.isFavorite ? "text-primary" : "text-foreground/75 hover:text-foreground"
            )}
            onClick={() => updateNote.mutate({ id, isFavorite: !note.isFavorite })}
            title="Favorite"
          >
            <Star
              className="h-3.5 w-3.5"
              fill={note.isFavorite ? "currentColor" : "none"}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 transition-colors",
              note.isPinned ? "text-primary" : "text-foreground/75 hover:text-foreground"
            )}
            onClick={() => updateNote.mutate({ id, isPinned: !note.isPinned })}
            title="Pin"
          >
            <Pin
              className="h-3.5 w-3.5"
              fill={note.isPinned ? "currentColor" : "none"}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-foreground/75 transition-colors hover:text-foreground"
            onClick={() => updateNote.mutate({ id, isArchived: !note.isArchived })}
            title={note.isArchived ? "Unarchive" : "Archive"}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-foreground/75 transition-colors hover:text-destructive"
            onClick={() => {
              if (confirm("Delete this note?")) {
                deleteNote.mutate({ id });
              }
            }}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <VersionHistoryDialog noteId={id} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-foreground/75 transition-colors hover:text-foreground"
                title="Export"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportMarkdown}>
                <FileText className="mr-2 h-3.5 w-3.5" />
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF}>
                <FileDown className="mr-2 h-3.5 w-3.5" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title */}
      <div className="px-10 pb-1 pt-8">
        <input
          value={displayTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/25 focus:outline-none"
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
          placeholder="Untitled"
        />
      </div>

      {/* Editor + Backlinks */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex-1">
          <Editor
            key={`${id}-${note.updatedAt}`}
            noteId={id}
            initialContent={note.content}
          />
        </div>
        <BacklinksPanel noteId={id} />
      </div>
    </div>
  );
}
