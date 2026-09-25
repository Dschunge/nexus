"use client";

import { useEffect, useState } from "react";
import { LinkFavicon } from "@/components/links/LinkFavicon";
import { cn } from "@/lib/utils";

interface Props {
  ogImageUrl: string | null;
  /** The stored page screenshot (see app/api/links/[id]/screenshot). */
  screenshotSrc: string | null;
  faviconUrl: string | null;
  domain: string;
  className?: string;
}

/**
 * Cover image for a link card. Preference order: the page's own og:image
 * (sites that publish one, like YouTube or GitHub, chose that picture), then
 * the screenshot taken at fetch time, then a muted tile with the enlarged
 * favicon. A broken image moves on to the next candidate. The tile is not
 * optional — every card reserves the same space so a grid of mixed links
 * keeps a straight baseline.
 */
export function LinkThumbnail({
  ogImageUrl,
  screenshotSrc,
  faviconUrl,
  domain,
  className,
}: Props) {
  const candidates = [ogImageUrl, screenshotSrc].filter(
    (u): u is string => Boolean(u)
  );
  const [attempt, setAttempt] = useState(0);

  // A refetched link can swap either image; give the new set a fresh run.
  useEffect(() => setAttempt(0), [ogImageUrl, screenshotSrc]);

  const src = candidates[attempt] ?? null;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-md border border-border/40 bg-muted/40",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full object-cover object-top"
          onError={() => setAttempt((a) => a + 1)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <LinkFavicon
            src={faviconUrl}
            domain={domain}
            className="h-8 w-8 opacity-60"
          />
        </div>
      )}
    </div>
  );
}
