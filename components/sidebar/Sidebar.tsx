"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/lib/auth-client";
import { FolderTree } from "./FolderTree";
import { CommandPalette } from "@/components/search/CommandPalette";
import {
  FileText,
  FolderPlus,
  LogOut,
  Star,
  Clock,
  Tag,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  Upload,
  X,
  GitFork,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { marked } from "marked";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: favorites } = useQuery(
    trpc.notes.list.queryOptions({ isFavorite: true })
  );
  const { data: recents } = useQuery(trpc.notes.recents.queryOptions());
  const { data: folders } = useQuery(trpc.folders.list.queryOptions());
  const { data: tags } = useQuery(trpc.tags.list.queryOptions());
  const { data: tagFilteredNotes } = useQuery({
    ...trpc.notes.list.queryOptions({ tagId: selectedTagId ?? undefined }),
    enabled: selectedTagId !== null,
  });

  const createNote = useMutation(
    trpc.notes.create.mutationOptions({
      onSuccess: (note) => {
        queryClient.invalidateQueries(trpc.notes.list.queryOptions({}));
        queryClient.invalidateQueries(trpc.notes.recents.queryOptions());
        router.push(`/notes/${note.id}`);
      },
      onError: () => toast.error("Failed to create note"),
    })
  );

  const importNote = useMutation(trpc.notes.create.mutationOptions());

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const toImport = Array.from(files).filter((f) =>
        /\.(md|mdx|txt)$/i.test(f.name)
      );
      if (toImport.length === 0) {
        toast.error("No Markdown or text files found");
        e.target.value = "";
        return;
      }
      toast.loading(
        `Importing ${toImport.length} note${toImport.length > 1 ? "s" : ""}…`,
        { id: "import" }
      );
      const results = await Promise.allSettled(
        toImport.map(async (file) => {
          const text = await file.text();
          const title = file.name.replace(/\.(md|mdx|txt)$/i, "");
          const content = marked(text) as string;
          return importNote.mutateAsync({ title, content });
        })
      );
      e.target.value = "";
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      queryClient.invalidateQueries(trpc.notes.list.queryOptions({}));
      queryClient.invalidateQueries(trpc.notes.recents.queryOptions());
      if (failed === 0) {
        toast.success(
          `Imported ${succeeded} note${succeeded > 1 ? "s" : ""}`,
          { id: "import" }
        );
      } else {
        toast.warning(`Imported ${succeeded}, failed ${failed}`, {
          id: "import",
        });
      }
    },
    [importNote, queryClient, trpc]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        createNote.mutate({ title: "Untitled" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createNote]);

  if (collapsed) {
    return (
      <>
        <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-border/50 bg-sidebar py-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground/60 hover:text-foreground"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar (Ctrl+\)"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground/50 hover:text-primary"
            onClick={() => createNote.mutate({ title: "Untitled" })}
            title="New note (Ctrl+N)"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground/60 hover:text-foreground"
            onClick={() => setCommandOpen(true)}
            title="Search (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      </>
    );
  }

  const noteLink = (noteId: string) =>
    cn(
      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-primary/8 hover:text-foreground",
      pathname === `/notes/${noteId}` && "bg-primary/10 text-primary"
    );

  return (
    <>
      <div className="flex w-70 shrink-0 flex-col border-r border-border/50 bg-sidebar">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-base font-semibold tracking-tight text-foreground">
            Nexus
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-foreground/70 hover:text-foreground"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar (Ctrl+\)"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-3 pb-3">
          <Button
            className="flex-1"
            size="sm"
            onClick={() => createNote.mutate({ title: "Untitled" })}
            disabled={createNote.isPending}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New note
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 border-border/60 text-foreground/70 hover:text-foreground"
            onClick={() => setCommandOpen(true)}
            title="Search (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 border-border/60 text-foreground/70 hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            title="Import Markdown files"
            disabled={importNote.isPending}
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.mdx,.txt"
            multiple
            className="hidden"
            onChange={handleImport}
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1 px-2 pb-4">
            {/* Favorites */}
            {favorites && favorites.length > 0 && (
              <section>
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Star className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium uppercase tracking-wider text-foreground/60">
                    Favorites
                  </span>
                </div>
                {favorites.map((note) => (
                  <Link key={note.id} href={`/notes/${note.id}`} className={noteLink(note.id)}>
                    <FileText className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
                    <span className="truncate">{note.title || "Untitled"}</span>
                  </Link>
                ))}
                <Separator className="my-2 opacity-30" />
              </section>
            )}

            {/* Recents */}
            {recents && recents.length > 0 && (
              <section>
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Clock className="h-3 w-3 text-foreground/80" />
                  <span className="text-xs font-medium uppercase tracking-wider text-foreground/60">
                    Recents
                  </span>
                </div>
                {recents.map((note) => (
                  <Link key={note.id} href={`/notes/${note.id}`} className={noteLink(note.id)}>
                    <FileText className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
                    <span className="truncate">{note.title || "Untitled"}</span>
                  </Link>
                ))}
                <Separator className="my-2 opacity-30" />
              </section>
            )}

            {/* Folders / Tag filter */}
            <section>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-foreground/60">
                  {selectedTagId ? "Tag" : "Folders"}
                </span>
                {selectedTagId ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-foreground/60 hover:text-foreground"
                    title="Clear tag filter"
                    onClick={() => setSelectedTagId(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-foreground/60 hover:text-foreground"
                    title="New folder"
                    onClick={() => {
                      const name = prompt("Folder name:");
                      if (name?.trim()) {
                        // handled by FolderTree
                      }
                    }}
                  >
                    <FolderPlus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {selectedTagId ? (
                tagFilteredNotes && tagFilteredNotes.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs italic text-muted-foreground">
                    No notes with this tag.
                  </p>
                ) : (
                  tagFilteredNotes?.map((note) => (
                    <Link key={note.id} href={`/notes/${note.id}`} className={noteLink(note.id)}>
                      <FileText className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
                      <span className="truncate">{note.title || "Untitled"}</span>
                    </Link>
                  ))
                )
              ) : (
                <FolderTree folders={folders ?? []} />
              )}
            </section>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <section>
                <Separator className="my-2 opacity-30" />
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Tag className="h-3 w-3 text-foreground/80" />
                  <span className="text-xs font-medium uppercase tracking-wider text-foreground/60">
                    Tags
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 px-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagId === tag.id ? "default" : "secondary"}
                      className="cursor-pointer rounded-full text-xs font-normal"
                      onClick={() =>
                        setSelectedTagId((prev) =>
                          prev === tag.id ? null : tag.id
                        )
                      }
                    >
                      {tag.name}
                      {tag._count.notes > 0 && (
                        <span className="ml-1 opacity-60">
                          {tag._count.notes}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border/40 p-2">
          <Link
            href="/graph"
            className={cn(
              "flex w-full items-center rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground",
              pathname === "/graph" && "bg-primary/10 text-primary"
            )}
          >
            <GitFork className="mr-2 h-3.5 w-3.5" />
            Graph view
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-foreground/60 hover:text-foreground"
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
