export class InvalidUrlError extends Error {
  constructor(message = "Enter a valid http(s) URL") {
    super(message);
    this.name = "InvalidUrlError";
  }
}

// Query params that only carry tracking state and never change the page.
const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "ref_src",
  "igshid",
  "si", // YouTube share links
]);

function isTrackingParam(name: string): boolean {
  return name.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(name);
}

/**
 * Canonical form of a user-entered URL. This is the value stored in
 * Link.url and used for the per-user uniqueness check, so the same page
 * entered twice with different tracking params / hash / casing collapses
 * to one row.
 */
export function normalizeUrl(raw: string): { url: string; domain: string } {
  let input = raw.trim();
  if (!input) throw new InvalidUrlError();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) input = `https://${input}`;

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new InvalidUrlError();
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidUrlError();
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "localhost" && !hostname.includes(".")) {
    throw new InvalidUrlError();
  }

  parsed.hostname = hostname;
  parsed.hash = "";
  if (
    (parsed.protocol === "http:" && parsed.port === "80") ||
    (parsed.protocol === "https:" && parsed.port === "443")
  ) {
    parsed.port = "";
  }

  const kept = [...parsed.searchParams.entries()]
    .filter(([name]) => !isTrackingParam(name))
    .sort(([a], [b]) => a.localeCompare(b));
  parsed.search = "";
  for (const [name, value] of kept) parsed.searchParams.append(name, value);

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return {
    url: parsed.toString(),
    domain: hostname.replace(/^www\./, ""),
  };
}

export function faviconFallbackUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

/** Turns a possibly relative favicon / og:image path into an absolute URL. */
export function resolveAssetUrl(
  value: string | null | undefined,
  base: string,
): string | null {
  if (!value) return null;
  try {
    const resolved = new URL(value, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}
