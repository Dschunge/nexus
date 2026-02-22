"use client";

import { useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  noteId: string;
}

export function AISuggestTags({ noteId }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const suggest = useMutation(
    trpc.tags.suggest.mutationOptions({
      onSuccess: (names) => {
        if (names.length === 0) {
          toast.info("No new tag suggestions for this note");
        } else {
          setSuggestions(names);
          setDismissed(false);
        }
      },
      onError: () => toast.error("Failed to get tag suggestions"),
    })
  );

  const createTag = useMutation(trpc.tags.create.mutationOptions());
  const attachTag = useMutation(
    trpc.tags.attachToNote.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.notes.get.queryOptions({ id: noteId }));
        queryClient.invalidateQueries(trpc.tags.list.queryOptions());
      },
    })
  );

  async function handleAdd(name: string) {
    try {
      const tag = await createTag.mutateAsync({ name });
      await attachTag.mutateAsync({ noteId, tagId: tag.id });
      setSuggestions((prev) => prev.filter((s) => s !== name));
    } catch {
      toast.error(`Failed to add tag "${name}"`);
    }
  }

  const isAdding = createTag.isPending || attachTag.isPending;
  const showSuggestions = suggestions.length > 0 && !dismissed;

  return (
    <div className="flex items-center gap-1">
      {showSuggestions && (
        <>
          <span className="text-xs text-muted-foreground">Suggested:</span>
          {suggestions.map((name) => (
            <Badge
              key={name}
              variant="outline"
              className={cn(
                "cursor-pointer border-dashed text-xs transition-opacity hover:border-solid hover:bg-accent",
                isAdding && "pointer-events-none opacity-50"
              )}
              onClick={() => handleAdd(name)}
            >
              + {name}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground"
            onClick={() => setDismissed(true)}
            title="Dismiss suggestions"
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        title="Suggest tags with AI"
        disabled={suggest.isPending}
        onClick={() => suggest.mutate({ noteId })}
      >
        <Sparkles
          className={cn(
            "h-3.5 w-3.5",
            suggest.isPending && "animate-pulse text-primary"
          )}
        />
      </Button>
    </div>
  );
}
