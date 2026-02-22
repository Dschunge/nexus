"use client";

import { useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { History } from "lucide-react";
import { formatDistanceToNow } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  noteId: string;
}

export function VersionHistoryDialog({ noteId }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: versions, isLoading } = useQuery({
    ...trpc.notes.versions.queryOptions({ noteId }),
    enabled: open,
  });

  const restoreVersion = useMutation(
    trpc.notes.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.notes.get.queryOptions({ id: noteId }));
        queryClient.invalidateQueries(
          trpc.notes.versions.queryOptions({ noteId })
        );
        setOpen(false);
        toast.success("Version restored");
      },
      onError: () => toast.error("Failed to restore version"),
    })
  );

  const selected =
    versions?.find((v) => v.id === selectedId) ?? versions?.[0] ?? null;

  const isEmpty = !isLoading && (!versions || versions.length === 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Version history">
          <History className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent
        className="flex h-[580px] max-w-4xl flex-col gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="flex-row items-center justify-between border-b border-border px-6 py-4">
          <DialogTitle>Version History</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-muted-foreground"
          >
            Close
          </Button>
        </DialogHeader>

        {/* Body */}
        {isLoading ? (
          <div className="flex-1 space-y-2 p-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No saved versions yet. Versions are created automatically as you edit.
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Version list */}
            <ScrollArea className="w-52 shrink-0 border-r border-border">
              <div className="p-2">
                {(versions ?? []).map((version, i) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedId(version.id)}
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                      (selectedId === version.id ||
                        (!selectedId && i === 0)) &&
                        "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="text-sm font-medium">
                      {i === 0 ? "Latest saved" : `Version ${(versions?.length ?? 0) - i}`}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(version.createdAt))} ago
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Preview + restore */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                {selected && (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none p-6"
                    dangerouslySetInnerHTML={{ __html: selected.content }}
                  />
                )}
              </ScrollArea>
              <Separator />
              <div className="flex items-center justify-end gap-2 px-6 py-3">
                <span className="mr-auto text-xs text-muted-foreground">
                  {selected
                    ? `Saved ${formatDistanceToNow(new Date(selected.createdAt))} ago`
                    : ""}
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!selected) return;
                    restoreVersion.mutate({
                      id: noteId,
                      content: selected.content,
                    });
                  }}
                  disabled={restoreVersion.isPending}
                >
                  Restore this version
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
