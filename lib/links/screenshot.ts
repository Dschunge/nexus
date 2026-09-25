import type { PrismaClient } from "@/lib/generated/prisma/client";

const DOWNLOAD_TIMEOUT_MS = 15_000;
// Firecrawl's viewport PNGs are tens to a few hundred KB; anything beyond
// this is not a screenshot we want in the database.
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Fetches the screenshot Firecrawl returned for a scrape. The URL is a
 * signed storage link that expires, so this runs right when the link is
 * saved, not later. Returns null for anything that is not a reasonably sized
 * https image, so a bad value degrades to "no screenshot" instead of failing
 * the save.
 */
export async function downloadScreenshot(
  url: string
): Promise<{ data: Uint8Array<ArrayBuffer>; contentType: string } | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type")?.split(";")[0].trim();
  if (!contentType?.startsWith("image/")) return null;
  const declared = Number(res.headers.get("content-length"));
  if (declared > MAX_BYTES) return null;

  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;
  return { data: buf, contentType };
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
