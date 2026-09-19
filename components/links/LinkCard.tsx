"use client";

import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Link } from "@/lib/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LinkFavicon } from "@/components/links/LinkFavicon";
import { CATEGORY_ICONS } from "@/components/links/categoryIcons";
import type { LinkFormValues } from "@/components/links/AddLinkDialog";
import { LINK_CATEGORY_META } from "@/lib/links/categories";
import { formatDistanceToNow } from "@/lib/format";
import { Copy, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  link: Link;
  onEdit: (values: LinkFormValues & { id: string }) => void;
}

export function LinkCard({ link, onEdit }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const CategoryIcon = CATEGORY_ICONS[link.category];

  const deleteLink = useMutation(
    trpc.links.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.links.pathFilter());
        toast.success("Link deleted");
      },
      onError: () => toast.error("Failed to delete link"),
    })
  );

  // Refetch never saves: the result opens the edit form so the user can
  // accept or discard it.
  const refetch = useMutation(
    trpc.links.refetch.mutationOptions({
      onMutate: () => toast.loading("Refreshing…", { id: `refetch-${link.id}` }),
      onSuccess: (preview) => {
        toast.dismiss(`refetch-${link.id}`);
        if (!preview.classified) {
          toast.warning("Fetched, but automatic classification failed");
        }
        onEdit({ ...preview, id: link.id, fetchedAt: new Date() });
      },
      onError: (error) =>
        toast.error(error.message, { id: `refetch-${link.id}` }),
    })
  );

  return (
    <div className="group flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-border">
      <div className="flex items-start gap-2">
        <LinkFavicon src={link.faviconUrl} domain={link.domain} className="mt-0.5" />
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground hover:text-primary hover:underline"
        >
          <span className="line-clamp-2">{link.title}</span>
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 -mt-1 h-7 w-7 shrink-0 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100 hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit({ ...link, id: link.id })}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => refetch.mutate({ id: link.id })}
              disabled={refetch.isPending}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh metadata
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(link.url);
                toast.success("URL copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                if (confirm(`Delete "${link.title}"?`)) {
                  deleteLink.mutate({ id: link.id });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="truncate">{link.domain}</span>
        <span className="opacity-50">·</span>
        <span className="shrink-0">{formatDistanceToNow(link.createdAt)}</span>
      </div>

      {link.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-foreground/70">
          {link.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        <Badge variant="secondary" className="rounded-full text-xs font-normal">
          <CategoryIcon className="mr-1 h-3 w-3" />
          {LINK_CATEGORY_META[link.category].label}
        </Badge>
        {link.subCategory && (
          <Badge variant="outline" className="rounded-full text-xs font-normal text-muted-foreground">
            {link.subCategory}
          </Badge>
        )}
      </div>
    </div>
  );
}
