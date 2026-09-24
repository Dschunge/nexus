"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AddLinkDialog, type LinkFormValues } from "@/components/links/AddLinkDialog";
import { CategoryFilter } from "@/components/links/CategoryFilter";
import { LinkCard } from "@/components/links/LinkCard";
import { LINK_CATEGORIES, type LinkCategory } from "@/lib/links/categories";
import { Link2, Plus, Search } from "lucide-react";

function isCategory(value: string | null): value is LinkCategory {
  return LINK_CATEGORIES.includes(value as LinkCategory);
}

function LinksPageContent() {
  const trpc = useTRPC();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState<LinkCategory | null>(() => {
    const c = searchParams.get("category");
    return isCategory(c) ? c : null;
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitial, setDialogInitial] = useState<
    (LinkFormValues & { id?: string }) | null
  >(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // /links?add=1 (from the command palette) opens the dialog once.
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setDialogInitial(null);
      setDialogOpen(true);
      router.replace("/links");
    }
  }, [searchParams, router]);

  const { data: links, isLoading } = useQuery(
    trpc.links.list.queryOptions({
      category: category ?? undefined,
      search: debouncedSearch.trim() || undefined,
    })
  );
  const { data: counts } = useQuery(trpc.links.counts.queryOptions());

  const openAdd = () => {
    setDialogInitial(null);
    setDialogOpen(true);
  };
  const openEdit = (values: LinkFormValues & { id: string }) => {
    setDialogInitial(values);
    setDialogOpen(true);
  };

  const isFiltered = category !== null || debouncedSearch.trim() !== "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">Links</h1>
        <span className="text-xs text-muted-foreground">
          {counts?.total ?? 0} {counts?.total === 1 ? "link" : "links"}
        </span>
        <div className="relative ml-auto w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search links…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add link
        </Button>
      </div>

      <div className="shrink-0 border-b border-border/40 px-6 py-2.5">
        <CategoryFilter
          value={category}
          onChange={setCategory}
          counts={counts?.byCategory}
          total={counts?.total ?? 0}
        />
      </div>

      {/* min-h-0 is required: a flex child defaults to min-height:auto, so
          without it the ScrollArea grows to its content height instead of
          the leftover space and the list is clipped with no scrollbar. */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : links && links.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {links.map((link) => (
                <LinkCard key={link.id} link={link} onEdit={openEdit} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <Link2 className="h-8 w-8 text-muted-foreground/50" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {isFiltered ? "No links match" : "No links yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isFiltered
                    ? "Try a different search or category."
                    : "Save a URL and we'll fetch its title, description and category."}
                </p>
              </div>
              {!isFiltered && (
                <Button size="sm" onClick={openAdd}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add link
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <AddLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={dialogInitial}
      />
    </div>
  );
}

// useSearchParams needs a Suspense boundary for the static build.
export default function LinksPage() {
  return (
    <Suspense>
      <LinksPageContent />
    </Suspense>
  );
}
