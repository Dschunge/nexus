"use client";

import { useRouter } from "next/navigation";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function NotesWelcomePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createNote = useMutation(
    trpc.notes.create.mutationOptions({
      onSuccess: (note) => {
        queryClient.invalidateQueries(trpc.notes.recents.queryOptions());
        router.push(`/notes/${note.id}`);
      },
      onError: () => toast.error("Failed to create note"),
    })
  );

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div className="space-y-3 text-center">
        <p
          className="text-5xl text-foreground/90"
          style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontWeight: 400,
            fontStyle: "italic",
            letterSpacing: "-0.01em",
          }}
        >
          Begin writing.
        </p>
        <p className="text-sm text-muted-foreground/70">
          Select a note from the sidebar or start a new one.
        </p>
      </div>

      <Button
        size="sm"
        onClick={() => createNote.mutate({ title: "Untitled" })}
        disabled={createNote.isPending}
      >
        <Plus className="mr-2 h-3.5 w-3.5" />
        New note
      </Button>

      <p className="text-xs text-muted-foreground/50">
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl+N</kbd>{" "}
        new note{" "}
        <span className="mx-1 opacity-50">·</span>{" "}
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl+K</kbd>{" "}
        search
      </p>
    </div>
  );
}
