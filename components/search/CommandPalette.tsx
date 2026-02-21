"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce query for search
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: searchResults } = useQuery({
    ...trpc.notes.search.queryOptions({ query: debouncedQuery }),
    enabled: debouncedQuery.trim().length > 0,
  });

  const createNote = useMutation(
    trpc.notes.create.mutationOptions({
      onSuccess: (note) => {
        queryClient.invalidateQueries(trpc.notes.recents.queryOptions());
        router.push(`/notes/${note.id}`);
        onOpenChange(false);
      },
      onError: () => toast.error("Failed to create note"),
    })
  );

  function handleSelect(href: string) {
    router.push(href);
    onOpenChange(false);
    setQuery("");
  }

  function handleClose() {
    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl" aria-describedby={undefined}>
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium">
          <div className="flex items-center border-b border-border px-3">
            <CommandInput
              placeholder="Search notes or type a command…"
              value={query}
              onValueChange={setQuery}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList className="max-h-[400px] overflow-y-auto overflow-x-hidden">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {query ? "No results found." : "Start typing to search…"}
            </CommandEmpty>

            {/* Search results */}
            {searchResults && searchResults.length > 0 && (
              <CommandGroup heading="Notes">
                {searchResults.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={`note-${note.id}`}
                    onSelect={() => handleSelect(`/notes/${note.id}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate font-medium">
                        {note.title || "Untitled"}
                      </div>
                      {note.content && (
                        <div className="truncate text-xs text-muted-foreground">
                          {stripHtml(note.content).slice(0, 80)}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            {/* Quick actions */}
            <CommandGroup heading="Actions">
              <CommandItem
                value="new-note-action"
                onSelect={() => {
                  createNote.mutate({ title: query ? query : "Untitled" });
                }}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span>New note{query ? `: "${query}"` : ""}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
