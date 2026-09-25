import { Firecrawl, SdkError } from "firecrawl";

export { SdkError as FirecrawlSdkError };

export class FirecrawlNotConfiguredError extends Error {
  constructor() {
    super("FIRECRAWL_API_KEY is not set");
    this.name = "FirecrawlNotConfiguredError";
  }
}

export const SCRAPE_TIMEOUT_MS = 30_000;

// Same convention as lib/anthropic.ts: instantiate fresh so env changes are
// picked up without a restart.
export function getFirecrawlClient(): Firecrawl {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new FirecrawlNotConfiguredError();
  return new Firecrawl({ apiKey, timeoutMs: SCRAPE_TIMEOUT_MS + 5_000 });
}

export interface ScrapedPage {
  markdown: string;
  title: string | null;
  description: string | null;
  language: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogSiteName: string | null;
  favicon: string | null;
  sourceURL: string | null;
  statusCode: number | null;
  /**
   * Viewport screenshot as a signed storage URL. It expires, so it is only
   * good for downloading right away (lib/links/screenshot.ts), never for
   * storing.
   */
  screenshot: string | null;
}

// A laptop-ish viewport: wide enough that sites render their desktop layout,
// short enough that the hero fills the card thumbnail.
export const SCREENSHOT_VIEWPORT = { width: 1280, height: 800 } as const;

// Metadata values are typed as strings but the API occasionally sends arrays
// (e.g. multiple og:image tags); keep the first.
function first(value: unknown): string | null {
  if (Array.isArray(value)) return first(value[0]);
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  // Some pages (e.g. YouTube) repeat a meta tag and the API joins the copies
  // with ", "; collapse "X, X" back to "X".
  const half = s.slice(0, Math.floor((s.length - 2) / 2));
  if (half && s === `${half}, ${half}`) return half;
  return s;
}

/**
 * One Firecrawl /scrape call (1 credit): main-content markdown plus the
 * page metadata we need for a link preview. SDK errors propagate; the tRPC
 * router maps them to user-facing codes.
 */
export async function scrapePage(url: string): Promise<ScrapedPage> {
  const doc = await getFirecrawlClient().scrape(url, {
    // The screenshot rides along on the same credit as the markdown.
    formats: [
      "markdown",
      { type: "screenshot", fullPage: false, viewport: SCREENSHOT_VIEWPORT },
    ],
    onlyMainContent: true,
    timeout: SCRAPE_TIMEOUT_MS,
  });
  const m = doc.metadata ?? {};
  return {
    markdown: doc.markdown ?? "",
    title: first(m.title),
    description: first(m.description),
    language: first(m.language),
    ogTitle: first(m.ogTitle),
    ogDescription: first(m.ogDescription),
    ogImage: first(m.ogImage),
    ogSiteName: first(m.ogSiteName),
    favicon: first(m.favicon),
    sourceURL: first(m.sourceURL),
    statusCode: typeof m.statusCode === "number" ? m.statusCode : null,
    screenshot: first(doc.screenshot),
  };
}
