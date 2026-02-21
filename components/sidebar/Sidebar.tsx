"use client";

import { useState, useEffect, useCallback } from "react";
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
  Pin,
  Star,
  Clock,
  Tag,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: recents } = useQuery(trpc.notes.recents.queryOptions());
  const { data: folders } = useQuery(trpc.folders.list.queryOptions());
  const { data: tags } = useQuery(trpc.tags.list.queryOptions());

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

  // Cmd+\ to toggle sidebar
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
        <div className="flex w-12 flex-col items-center gap-2 border-r border-border py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar (Ctrl+\)"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => createNote.mutate({ title: "Untitled" })}
            title="New note (Ctrl+N)"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
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

  return (
    <>
      <div className="flex w-[280px] shrink-0 flex-col border-r border-border bg-sidebar">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">Nexus</span>
          <Button
            variant="ghost"
            size="icon"
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
            <Plus className="mr-1 h-3.5 w-3.5" />
            New note
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setCommandOpen(true)}
            title="Search (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1 px-2 pb-4">
            {/* Recents */}
            {recents && recents.length > 0 && (
              <section>
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Recents
                  </span>
                </div>
                {recents.map((note) => (
                  <Link
                    key={note.id}
                    href={`/notes/${note.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                      pathname === `/notes/${note.id}` &&
                        "bg-accent text-accent-foreground"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{note.title || "Untitled"}</span>
                  </Link>
                ))}
                <Separator className="my-2" />
              </section>
            )}

            {/* Folders */}
            <section>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Folders
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
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
              </div>
              <FolderTree folders={folders ?? []} />
            </section>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <section>
                <Separator className="my-2" />
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tags
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 px-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                    >
                      {tag.name}
                      {tag._count.notes > 0 && (
                        <span className="ml-1 text-muted-foreground">
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
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
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
