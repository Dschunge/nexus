import type { PrismaClient } from "@/lib/generated/prisma/client";

const DOWNLOAD_TIMEOUT_MS = 15_000;
// Firecrawl's viewport PNGs are tens to a few hundred KB; anything beyond
// this is not a screenshot we want in the database.
const MAX_BYTES = 5 * 1024 * 1024;

// Where Firecrawl hosts scrape screenshots (verified against a live scrape):
// signed URLs under this bucket. The server only ever fetches from here, so a
// crafted screenshotUrl cannot make it reach internal hosts or third parties.
// If Firecrawl moves buckets, storeScreenshot logs the rejected host.
const ALLOWED_HOST = "storage.googleapis.com";
const ALLOWED_PATH_PREFIX = "/firecrawl-scrape-media/";

export function isAllowedScreenshotUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.hostname === ALLOWED_HOST &&
    parsed.pathname.startsWith(ALLOWED_PATH_PREFIX)
  );
}

/**
 * Fetches the screenshot Firecrawl returned for a scrape. The URL is a
 * signed storage link that expires, so this runs right when the link is
 * saved, not later. Only Firecrawl's own bucket is fetched, redirects are
 * not followed, and the body is read in chunks so an oversized or
 * length-less response is cut off at MAX_BYTES instead of being buffered.
 * Returns null for anything that is not an acceptable image, so a bad value
 * degrades to "no screenshot" instead of failing the save.
 */
export async function downloadScreenshot(
  url: string
): Promise<{ data: Uint8Array<ArrayBuffer>; contentType: string } | null> {
  if (!isAllowedScreenshotUrl(url)) return null;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    redirect: "manual",
  });
  if (!res.ok || !res.body) return null;
  const contentType = res.headers.get("content-type")?.split(";")[0].trim();
  if (!contentType?.startsWith("image/")) return null;
  const declared = Number(res.headers.get("content-length"));
  if (declared > MAX_BYTES) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) return null;

  const data = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { data, contentType };
}

/**
 * Downloads the screenshot and stores it for the link, stamping
 * Link.screenshotAt so the card knows there is one (and can cache-bust on
 * it). Failures are logged and swallowed: a link without a screenshot is
 * still a saved link.
 */
export async function storeScreenshot(
  prisma: PrismaClient,
  linkId: string,
  screenshotUrl: string
): Promise<void> {
  try {
    if (!isAllowedScreenshotUrl(screenshotUrl)) {
      console.warn(
        `Screenshot for link ${linkId} rejected: not a Firecrawl storage URL`
      );
      return;
    }
    const shot = await downloadScreenshot(screenshotUrl);
    if (!shot) return;
    const now = new Date();
    await prisma.$transaction([
      prisma.linkScreenshot.upsert({
        where: { linkId },
        create: { linkId, data: shot.data, contentType: shot.contentType },
        update: { data: shot.data, contentType: shot.contentType },
      }),
      prisma.link.update({ where: { id: linkId }, data: { screenshotAt: now } }),
    ]);
  } catch (error) {
    console.error(`Storing screenshot for link ${linkId} failed:`, error);
  }
}
