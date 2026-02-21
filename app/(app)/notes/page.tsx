"use client";

import { useRouter } from "next/navigation";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
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
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-muted p-6">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold">No note selected</h2>
        <p className="mt-1 text-muted-foreground">
          Select a note from the sidebar or create a new one
        </p>
      </div>
      <Button
        onClick={() => createNote.mutate({ title: "Untitled" })}
        disabled={createNote.isPending}
      >
        <Plus className="mr-2 h-4 w-4" />
        New note
      </Button>
      <p className="text-xs text-muted-foreground">
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl+N</kbd>{" "}
        new note &nbsp;·&nbsp;{" "}
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl+K</kbd>{" "}
        search
      </p>
    </div>
  );
}
