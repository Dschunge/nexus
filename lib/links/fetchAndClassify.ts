import { scrapePage } from "@/lib/firecrawl";
import { classifyLink } from "@/lib/links/classify";
import { type LinkCategory } from "@/lib/links/categories";
import { faviconFallbackUrl, resolveAssetUrl } from "@/lib/links/normalizeUrl";

export const MAX_STORED_CONTENT_CHARS = 10_000;

export class ScrapeFailedError extends Error {
  constructor(public readonly statusCode: number) {
    super(`The site responded with ${statusCode}`);
    this.name = "ScrapeFailedError";
  }
}

export interface LinkPreview {
  url: string;
  domain: string;
  title: string;
  description: string;
  category: LinkCategory;
  subCategory: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  siteName: string | null;
  content: string;
  /** false when Claude failed and the metadata fallback was used */
  classified: boolean;
}

/**
 * Firecrawl scrape (1 credit) followed by Claude classification. A
 * classification failure degrades to the raw page metadata instead of
 * failing the whole fetch, since the user reviews the form anyway.
 */
export async function fetchAndClassify(normalized: {
  url: string;
  domain: string;
}): Promise<LinkPreview> {
  const page = await scrapePage(normalized.url);
  if (page.statusCode !== null && page.statusCode >= 400) {
    throw new ScrapeFailedError(page.statusCode);
  }

  const base = page.sourceURL ?? normalized.url;
  const faviconUrl =
    resolveAssetUrl(page.favicon, base) ?? faviconFallbackUrl(normalized.domain);
  const ogImageUrl = resolveAssetUrl(page.ogImage, base);
  const siteName = page.ogSiteName;
  const content = page.markdown.slice(0, MAX_STORED_CONTENT_CHARS);

  const common = {
    url: normalized.url,
    domain: normalized.domain,
    faviconUrl,
    ogImageUrl,
    siteName,
    content,
  };

  try {
    const c = await classifyLink({
      url: normalized.url,
      domain: normalized.domain,
      title: page.title ?? page.ogTitle,
      description: page.description ?? page.ogDescription,
      siteName,
      markdown: page.markdown,
    });
    return { ...common, ...c, classified: true };
  } catch (error) {
    console.error("Link classification failed:", error);
    return {
      ...common,
      title: page.title ?? page.ogTitle ?? normalized.domain,
      description: page.description ?? page.ogDescription ?? "",
      category: "OTHER",
      subCategory: null,
      classified: false,
    };
  }
}
