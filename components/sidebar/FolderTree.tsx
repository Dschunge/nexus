"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronRight, Folder, FolderOpen, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FolderWithChildren = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  children: FolderWithChildren[];
  _count?: { notes: number };
};

function FolderItem({
  folder,
  depth = 0,
}: {
  folder: FolderWithChildren;
  depth?: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: notes } = useQuery(
    trpc.notes.list.queryOptions({ folderId: folder.id })
  );

  const createNote = useMutation(
    trpc.notes.create.mutationOptions({
      onSuccess: (note) => {
        queryClient.invalidateQueries(trpc.notes.recents.queryOptions());
        router.push(`/notes/${note.id}`);
      },
      onError: () => toast.error("Failed to create note"),
    })
  );

  const hasChildren = folder.children.length > 0 || (notes && notes.length > 0);

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md py-1 hover:bg-primary/8 hover:text-foreground",
          "cursor-pointer text-sm text-foreground/80"
        )}
        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: "8px" }}
        onClick={() => setOpen((o) => !o)}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-90")}
          />
        ) : (
          <span className="w-3.5" />
        )}
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/60" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
        )}
        <span className="flex-1 truncate">{folder.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            createNote.mutate({ title: "Untitled", folderId: folder.id });
          }}
          title="New note in folder"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {open && (
        <div>
          {folder.children.map((child) => (
            <FolderItem key={child.id} folder={child} depth={depth + 1} />
          ))}
          {notes?.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className={cn(
                "flex items-center gap-2 rounded-md py-1 text-sm text-foreground/80 hover:bg-primary/8 hover:text-foreground",
                pathname === `/notes/${note.id}` && "bg-primary/10 text-primary"
              )}
              style={{ paddingLeft: `${20 + (depth + 1) * 12}px`, paddingRight: "8px" }}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
              <span className="truncate">{note.title || "Untitled"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({ folders }: { folders: FolderWithChildren[] }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createFolder = useMutation(
    trpc.folders.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.folders.list.queryOptions());
      },
      onError: () => toast.error("Failed to create folder"),
    })
  );

  if (folders.length === 0) {
    return (
      <div className="px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-foreground/70 text-xs hover:text-foreground/80"
          onClick={() => {
            const name = prompt("Folder name:");
            if (name?.trim()) {
              createFolder.mutate({ name: name.trim() });
            }
          }}
        >
          <Plus className="mr-1 h-3 w-3" />
          New folder
        </Button>
      </div>
    );
  }

  return (
    <div>
      {folders.map((folder) => (
        <FolderItem key={folder.id} folder={folder} />
      ))}
      <div className="px-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-foreground/70 text-xs hover:text-foreground/80"
          onClick={() => {
            const name = prompt("Folder name:");
            if (name?.trim()) {
              createFolder.mutate({ name: name.trim() });
            }
          }}
        >
          <Plus className="mr-1 h-3 w-3" />
          New folder
        </Button>
      </div>
    </div>
  );
}
