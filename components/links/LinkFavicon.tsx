"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { faviconFallbackUrl } from "@/lib/links/normalizeUrl";
import { cn } from "@/lib/utils";

interface Props {
  src: string | null | undefined;
  domain: string;
  className?: string;
}

/**
 * Favicon with a two-stage fallback: the stored URL → a favicon service for
 * the domain → a generic globe. Plain <img> on purpose: icons come from
 * arbitrary hosts, which next/image would need a wildcard remotePattern for.
 */
export function LinkFavicon({ src, domain, className }: Props) {
  const [stage, setStage] = useState(0);
  const candidates = [src ?? null, faviconFallbackUrl(domain)].filter(
    (c): c is string => Boolean(c)
  );

  // A new link (or a refetched icon) restarts the fallback chain.
  useEffect(() => setStage(0), [src, domain]);

  const current = candidates[stage];
  if (!current) {
    return (
      <Globe
        className={cn("h-4 w-4 shrink-0 text-muted-foreground", className)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt=""
      referrerPolicy="no-referrer"
      loading="lazy"
      className={cn("h-4 w-4 shrink-0 rounded-sm object-contain", className)}
      onError={() => setStage((s) => s + 1)}
    />
  );
}
