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
import { Star, Archive, Trash2, Pin } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          key={id}
          noteId={id}
          initialContent={note.content}
        />
      </div>
    </div>
  );
}
