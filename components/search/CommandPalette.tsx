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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Clock, FileText, Plus } from "lucide-react";
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

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data: searchResults } = useQuery({
    ...trpc.notes.search.queryOptions({ query: debouncedQuery }),
    enabled: debouncedQuery.trim().length > 0,
  });

  const { data: recents } = useQuery(trpc.notes.recents.queryOptions());

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
      <DialogContent
        className="overflow-hidden p-0 shadow-2xl backdrop-blur-xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Quick Switcher</DialogTitle>
        <Command className="**:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:text-muted-foreground/60">
          <div className="flex items-center border-b border-border/50 px-4">
            <CommandInput
              placeholder="Search notes…"
              value={query}
              onValueChange={setQuery}
              className="flex h-13 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <CommandList className="max-h-95 overflow-y-auto overflow-x-hidden py-1">
            <CommandEmpty className="py-8 text-center text-sm italic text-muted-foreground/60">
              {query ? "No results found." : "No recent notes."}
            </CommandEmpty>

            {/* Recent notes */}
            {query === "" && recents && recents.length > 0 && (
              <CommandGroup heading="Recent">
                {recents.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={`recent-${note.id}`}
                    onSelect={() => handleSelect(`/notes/${note.id}`)}
                    className="mx-1 flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors aria-selected:bg-primary/10 aria-selected:text-primary"
                  >
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    <span className="truncate">{note.title || "Untitled"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Search results */}
            {query !== "" && searchResults && searchResults.length > 0 && (
              <CommandGroup heading="Notes">
                {searchResults.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={`note-${note.id}`}
                    onSelect={() => handleSelect(`/notes/${note.id}`)}
                    className="mx-1 flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors aria-selected:bg-primary/10 aria-selected:text-primary"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate">{note.title || "Untitled"}</div>
                      {note.content && (
                        <div className="truncate text-xs text-muted-foreground/60">
                          {stripHtml(note.content).slice(0, 80)}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator className="my-1 opacity-30" />

            <CommandGroup heading="Actions">
              <CommandItem
                value="new-note-action"
                onSelect={() => {
                  createNote.mutate({ title: query ? query : "Untitled" });
                }}
                className="mx-1 flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors aria-selected:bg-primary/10 aria-selected:text-primary"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
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
