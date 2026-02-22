"use client";

import { use, useState, useCallback, useRef } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Editor } from "@/components/editor/Editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "@/lib/format";
import { Star, Archive, Trash2, Pin, Download, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BacklinksPanel } from "@/components/editor/BacklinksPanel";
import { VersionHistoryDialog } from "@/components/editor/VersionHistoryDialog";
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
      <div className="flex h-full flex-col gap-4 p-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
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
    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>${displayTitle}</title>
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
  <h1>${displayTitle}</h1>
  ${noteContent}
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Pop-up blocked — allow pop-ups and try again"); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Note toolbar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Updated {formatDistanceToNow(new Date(note.updatedAt))} ago
          </span>
          {note.tags.length > 0 && (
            <>
              <span>·</span>
              <div className="flex gap-1">
                {note.tags.map(({ tag }) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", note.isFavorite && "text-yellow-500")}
            onClick={() => updateNote.mutate({ id, isFavorite: !note.isFavorite })}
            title="Favorite"
          >
            <Star className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", note.isPinned && "text-primary")}
            onClick={() => updateNote.mutate({ id, isPinned: !note.isPinned })}
            title="Pin"
          >
            <Pin className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => updateNote.mutate({ id, isArchived: !note.isArchived })}
            title={note.isArchived ? "Unarchive" : "Archive"}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
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
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Export">
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
      <div className="px-8 pt-6">
        <Input
          value={displayTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="border-0 bg-transparent px-0 text-3xl font-bold shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
          placeholder="Untitled"
        />
      </div>

      {/* Editor + Backlinks */}
      <div className="flex-1 overflow-y-auto flex flex-col">
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
