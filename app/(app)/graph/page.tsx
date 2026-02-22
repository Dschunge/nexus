"use client";

import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { GraphView } from "@/components/graph/GraphView";
import { Skeleton } from "@/components/ui/skeleton";

export default function GraphPage() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.notes.graph.queryOptions());

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-64 w-64 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">Graph View</h1>
        <span className="ml-3 text-xs text-muted-foreground">
          {data?.nodes.length ?? 0} notes · {data?.links.length ?? 0} connections
        </span>
      </div>
      <div className="flex-1">
        <GraphView nodes={data?.nodes ?? []} links={data?.links ?? []} />
      </div>
    </div>
  );
}
