"use client";

import { useEffect, useState } from "react";
import { LinkFavicon } from "@/components/links/LinkFavicon";
import { cn } from "@/lib/utils";

interface Props {
  ogImageUrl: string | null;
  faviconUrl: string | null;
  domain: string;
  className?: string;
}

/**
 * Cover image for a link card: the page's og:image when there is one, else a
 * muted tile with the enlarged favicon. The tile is not optional — every card
 * reserves the same space so a grid of mixed links keeps a straight baseline.
 */
export function LinkThumbnail({
  ogImageUrl,
  faviconUrl,
  domain,
  className,
}: Props) {
  const [failed, setFailed] = useState(false);

  // A refetched link can swap the image; give the new URL its own attempt.
  useEffect(() => setFailed(false), [ogImageUrl]);

  const showImage = Boolean(ogImageUrl) && !failed;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-md border border-border/40 bg-muted/40",
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ogImageUrl!}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
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
