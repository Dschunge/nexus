# Plan: Links library (Firecrawl fetch + Claude classification)


## Context

Nexus currently stores only notes. The user wants to capture internet links (GitHub repos, YouTube videos, articles, websites …) as first-class items: paste a URL, have the app fetch a title, description, category, sub-category and an icon/logo, review the result, and save it. Links form a **standalone library** (own page + sidebar entry), independent of notes.

Decisions already made with the user:
- **Fetching**: Firecrawl `/scrape` (markdown + page metadata, 1 credit per fetch).
- **Classification**: Claude (`claude-sonnet-4-6`, already integrated) picks the category from a **fixed list**, writes a free-text sub-category, and tidies title/description.
- **Flow**: enter URL → fetch → editable preview → save. The user can correct anything before it is stored.
- **Icon**: store favicon / og:image **URLs** only (no binary storage), with a fallback favicon service.
- User has a Firecrawl API key; it goes into `.env` as `FIRECRAWL_API_KEY`.

## Verified codebase facts the plan builds on

- Prisma 7: `prisma/schema.prisma` → client generated to `lib/generated/prisma/` (import from `@/lib/generated/prisma/client`, enums from `@/lib/generated/prisma/enums`). Schema applied with `pnpm prisma db push` (no migrations). All ids `cuid()`, per-user rows with `userId` + `onDelete: Cascade`, uniqueness like `Tag`'s `@@unique([name, userId])`.
- tRPC: routers in `lib/trpc/routers/*.ts` using `router`/`protectedProcedure` from `lib/trpc/init.ts` (`ctx.prisma`, `ctx.user.id`); ownership check `findFirst({ where: { id, userId } })` → `TRPCError NOT_FOUND`; delete returns `{ success: true }`. Root router `lib/trpc/router.ts` composes `notes, folders, tags, ai`.
- AI: `getAnthropicClient()` in `lib/anthropic.ts`; existing JSON-in-text pattern in `lib/trpc/routers/tags.ts` (`suggest`). SDK 0.78 supports `tools` + `tool_choice: { type: "tool", name }`.
- Client: `useTRPC()` from `lib/trpc/client.tsx`; `useQuery(trpc.x.queryOptions(i))`, `useMutation(trpc.x.mutationOptions({...}))`; `trpc.links.pathFilter()` is available for prefix invalidation (`@trpc/tanstack-react-query`); toasts via `sonner`.
- UI: page template `app/(app)/graph/page.tsx`; dialog reference `components/editor/VersionHistoryDialog.tsx`; sidebar footer nav `<Link href="/graph">` in `components/sidebar/Sidebar.tsx:361`; `components/search/CommandPalette.tsx` (cmdk). `components/ui/` has badge, button, dialog, dropdown-menu, input, scroll-area, separator, skeleton, textarea, tooltip (no select/label/card). `lib/format.ts` has `formatDistanceToNow`.
- `firecrawl` SDK v4.40.0 (Node ≥ 22) depends on **zod 3**; project uses **zod 4** → never pass Zod schemas to the SDK (not needed: we only request `markdown`).
- `next.config.ts` is empty; no remote image config exists.

## 1. Data model — `prisma/schema.prisma`

Prisma **enum** for the category (DB-level integrity + generated TS type shared by server and client; `db push` can add values later without data loss).

```prisma
enum LinkCategory {
  DEVELOPMENT
  DOCUMENTATION
  ARTICLE
  VIDEO
  TOOL
  DESIGN
  LEARNING
  SOCIAL
  SHOPPING
  OTHER
}

model Link {
  id          String       @id @default(cuid())
  url         String                       // normalized (see normalizeUrl)
  domain      String                       // hostname without "www."
  title       String
  description String       @default("")
  category    LinkCategory @default(OTHER)
  subCategory String?
  faviconUrl  String?
  ogImageUrl  String?
  siteName    String?
  content     String       @default("")    // Firecrawl markdown, capped at 10 000 chars (for search)
  fetchedAt   DateTime?                    // null when added manually / fetch failed
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([url, userId])
  @@index([userId, category])
}
```

Add `links Link[]` to `model User`.

## 2. Server

### `lib/firecrawl.ts` (new)
- `getFirecrawlClient()` — fresh `new Firecrawl({ apiKey })` per call (same convention as `lib/anthropic.ts`); throws `FirecrawlNotConfiguredError` when `FIRECRAWL_API_KEY` is unset.
- `scrapePage(url): Promise<ScrapedPage>` — `client.scrape(url, { formats: ["markdown"], onlyMainContent: true, timeout: 30_000 })`; maps `doc.metadata` (`title, description, language, ogTitle, ogDescription, ogImage, ogSiteName, favicon, sourceURL, statusCode`; take first element when a value is an array) + `doc.markdown ?? ""`. SDK errors propagate; the router maps them.

### `lib/links/categories.ts` (new, importable from server and client)
- `LINK_CATEGORIES = Object.values(LinkCategory)` (from `@/lib/generated/prisma/enums`) → used by Zod `z.enum(...)` and the Claude tool schema, so they cannot drift.
- `LINK_CATEGORY_META: Record<LinkCategory, { label, description }>` — labels for the UI, descriptions reused verbatim in the classifier prompt. `Record<LinkCategory, …>` makes TS fail if the enum and the map diverge.

### `lib/links/normalizeUrl.ts` (new)
- `normalizeUrl(raw) → { url, domain }` (throws `InvalidUrlError`): trim; prepend `https://` if no scheme; `new URL`; only `http(s):`; lowercase host; drop default ports; drop hash; strip tracking params (`utm_*`, `fbclid`, `gclid`, `dclid`, `msclkid`, `mc_cid`, `mc_eid`, `ref_src`, `igshid`, `si`) but keep everything else (YouTube `v=` must survive); sort remaining params; strip trailing slash on non-root paths; `domain` = host without `www.`.
- `faviconFallbackUrl(domain)` → `https://www.google.com/s2/favicons?domain=<domain>&sz=64`.
- `resolveAssetUrl(value, base)` → absolute-ifies relative favicon/og paths.
- Used server-side before every uniqueness check and scrape, and client-side for instant validation.

### `lib/links/classify.ts` (new)
- **Anthropic tool-use** instead of the regex/`JSON.parse` pattern from `tags.suggest`: a tool `input_schema` with `category: { enum: LINK_CATEGORIES }` and `tool_choice: { type: "tool", name: "classify_link" }` guarantees a structurally valid object (no fences, no prose, exact enum). Result still passes through a small Zod schema as a defensive check.
- `classifyLink({ url, domain, title, description, siteName, markdown }) → { title (≤120), description (≤300, 1–2 sentences), category, subCategory (≤40 chars | null) }`; markdown truncated to ~3000 chars; `max_tokens: 400`.
- Prompt outline: personal bookmark library; strip site suffixes (" | GitHub", " - YouTube"); neutral description of what the page is; exactly one category (list with `LINK_CATEGORY_META` descriptions); short sub-category (2–3 words, e.g. "TypeScript library", "Conference talk"); never invent facts.

### `lib/links/fetchAndClassify.ts` (new) — shared by `preview` and `refetch`
- `fetchAndClassify({ url, domain }) → LinkPreview` = `scrapePage` → throw `ScrapeFailedError(statusCode)` on ≥ 400 → favicon/og URLs via `resolveAssetUrl` (favicon falls back to `faviconFallbackUrl`) → `classifyLink` in try/catch; on failure degrade to metadata (`title ?? ogTitle ?? domain`, `description ?? ogDescription ?? ""`, `OTHER`, `subCategory: null`) and set `classified: false`.
- `LinkPreview` = `{ url, domain, title, description, category, subCategory, faviconUrl, ogImageUrl, siteName, content (≤10k), classified }`.

### `lib/trpc/routers/links.ts` (new) + register `links: linksRouter` in `lib/trpc/router.ts`

Shared input: `linkFields = z.object({ title: trim.min(1).max(200), description: trim.max(1000).default(""), category: z.enum(LINK_CATEGORIES), subCategory: trim.max(60).nullable().optional(), faviconUrl/ogImageUrl: z.url().nullable().optional(), siteName: max(200).nullable().optional(), content: max(10_000).optional(), fetchedAt: z.date().nullable().optional() })`.

| Procedure | Type | Input | Returns |
|---|---|---|---|
| `preview` | mutation (spends a credit) | `{ url }` | `LinkPreview` — normalize → **duplicate check first** (no credit wasted) → `fetchAndClassify` |
| `create` | mutation | `linkFields.extend({ url })` | `Link` — re-normalize server-side; catch Prisma `P2002` → `CONFLICT` |
| `list` | query | `{ category?, search? }` | `Link[]` by `createdAt desc`; search = Prisma `contains … mode: "insensitive"` over title/description/domain/subCategory/content (upgrade to `notes.search`'s `to_tsvector` `$queryRaw` only if it gets slow) |
| `counts` | query | — | `{ total, byCategory }` via `groupBy` (filter chips) |
| `get` | query | `{ id }` | `Link` / `NOT_FOUND` |
| `update` | mutation | `linkFields.partial().extend({ id })` | `Link` (url immutable) |
| `delete` | mutation | `{ id }` | `{ success: true }` |
| `refetch` | mutation | `{ id }` | `LinkPreview` (not saved; client opens edit form prefilled) |

Error mapping (message is shown in the dialog):

| Situation | Code | Message |
|---|---|---|
| `InvalidUrlError` | `BAD_REQUEST` | "Enter a valid http(s) URL" |
| duplicate (pre-check or `P2002`) | `CONFLICT` | "This link is already in your library" |
| `FirecrawlNotConfiguredError` | `PRECONDITION_FAILED` | "Link fetching is not configured (FIRECRAWL_API_KEY missing)" |
| scrape timeout | `TIMEOUT` | "The page took too long to load" |
| other scrape/network error | `BAD_GATEWAY` | "Could not fetch this page" |
| `ScrapeFailedError` (4xx/5xx from site) | `BAD_GATEWAY` | "The site responded with <status>" |
| Claude failed | no error; `classified: false` | client `toast.warning("Fetched, but automatic classification failed")` |

Any non-`CONFLICT` preview failure offers **"Add manually"** (form prefilled with url, domain, fallback favicon, `OTHER`).

## 3. Client

### `app/(app)/links/page.tsx` (new, `"use client"`, modelled on `graph/page.tsx`)
- State: `category | null`, `search` (300 ms debounce like `CommandPalette`), dialog open/edit/prefill. `useSearchParams`: `?add=1` opens the dialog; `?category=` preselects.
- Queries: `links.list({ category, search })`, `links.counts()`.
- Layout: header (`h1` "Links", count, search `Input`, "Add link" `Button`) → `CategoryFilter` chips → `ScrollArea` grid (`sm:grid-cols-2 xl:grid-cols-3`) of `LinkCard`; skeleton cards; empty states.

### `components/links/AddLinkDialog.tsx` (new; pattern from `VersionHistoryDialog.tsx`)
- Props `{ open, onOpenChange, initial?: ({ id?: string } & form values) | null }` — with `initial.id` it is **edit mode** (Save → `update`), else add mode.
- Steps `"url" | "form"`. URL step: `Input` (autofocus, Enter submits) + "Fetch" with spinner; client-side `normalizeUrl` pre-check. Errors inline from `error.message`; "Add manually" unless `CONFLICT`.
- Form step: preview strip (favicon + domain + siteName, og thumbnail), `Input` title, `Textarea` description, category as a **native `<select>`** styled with `components/ui/input.tsx`'s classes (avoids adding shadcn `select` for a 10-item list; drop-in swap later), `Input` subCategory. Footer: Back (add mode) / Save.
- Mutations `create`/`update`: `onSuccess → queryClient.invalidateQueries(trpc.links.pathFilter()); toast.success("Link saved"); close`, `onError → toast.error(e.message)`. Reset state on close.

### `components/links/LinkCard.tsx` (new)
Favicon + title (`<a target="_blank" rel="noopener noreferrer">`) + `DropdownMenu` (Edit, Refresh metadata, Copy URL, Delete with `confirm()`); domain + `formatDistanceToNow(createdAt)`; description `line-clamp-2`; `Badge` category (with icon) + `subCategory` outline badge. `delete` → `invalidateQueries(trpc.links.pathFilter())`; `refetch` → `toast.loading(..., { id })` → opens dialog in edit mode prefilled.

### `components/links/LinkFavicon.tsx` (new)
Plain `<img referrerPolicy="no-referrer" loading="lazy">` with two-stage `onError` fallback: `src` → `faviconFallbackUrl(domain)` → lucide `Globe`. **Not `next/image`**: icons come from arbitrary hosts (would need `remotePatterns: "**"`, negating the optimizer's benefit); `next.config.ts` stays untouched.

### `components/links/CategoryFilter.tsx` (new)
`Badge` chip row ("All (n)" + categories with count > 0), same pattern as the tag chips in `Sidebar.tsx`.

### `components/links/categoryIcons.ts` (new)
`Record<LinkCategory, LucideIcon>` (Code2, BookOpen, Newspaper, Video, Wrench, Palette, GraduationCap, MessageCircle, ShoppingCart, Link2). Kept out of `lib/links/categories.ts` so the server module has no icon import.

### `components/sidebar/Sidebar.tsx` (edit)
Footer: add `<Link href="/links">` (icon `Link2`, active on `pathname.startsWith("/links")`) above the Graph view item; add a `Link2` button to the collapsed rail.

### `components/search/CommandPalette.tsx` (edit, small)
"Links" group from `links.list({ search })` (opens in new tab) + "Add link" action → `/links?add=1`; placeholder "Search notes and links…".

### Invalidation
`create`/`update`/`delete` → `queryClient.invalidateQueries(trpc.links.pathFilter())` (covers every `list` input, `counts`, `get`). `preview`/`refetch` never touch the cache.

## 4. Config / docs

- `pnpm add firecrawl` (server-only; imported only by `lib/firecrawl.ts`).
- `.env`: `FIRECRAWL_API_KEY=fc-...` (user pastes the key).
- `pnpm prisma db push` (also regenerates client; `lib/generated/prisma/enums.ts` gains `LinkCategory`).
- `CLAUDE.md`: env block + `links` in router list + new "Links" architecture section (Firecrawl scrape → Claude tool-use classification; `normalizeUrl` is the uniqueness key; `preview` is a mutation because it spends a credit; category enum mirrored by `LINK_CATEGORY_META`) + `components/links/` under sidebar/navigation.
- `README.md`: env var (with "get a key at firecrawl.dev"), Links in features/stack, new dirs in the tree.
- No `next.config.ts` change, no new shadcn components.

## 5. Implementation order (each step verifiable)

0. Save this plan as `docs/plan-links.md`.
1. Schema (enum, `Link`, `User.links`) → `pnpm prisma db push`. Check `enums.ts` exports `LinkCategory`; `\d "Link"` in psql.
2. `lib/links/categories.ts`, `lib/links/normalizeUrl.ts` → `pnpm tsc --noEmit`; spot-check normalization (YouTube `?v=&si=`, `www.GitHub.com/a/b/#readme`, `utm_*`, `not a url`).
3. `pnpm add firecrawl` → `lib/firecrawl.ts`; one-off script scraping `https://github.com/vercel/next.js` prints metadata.
4. `lib/links/classify.ts`, `lib/links/fetchAndClassify.ts`; verify classification and the `classified: false` fallback (temporarily bad `ANTHROPIC_API_KEY`).
5. `lib/trpc/routers/links.ts` + register; `tsc` + curl with a session cookie.
6. `components/links/*` + `app/(app)/links/page.tsx`; full browser flow.
7. Sidebar + CommandPalette edits.
8. Docs; then **ask before committing** (e.g. "Add Links library with Firecrawl fetching and Claude classification").

## 6. Verification (end-to-end, dev server on :3000, both API keys set)

1. Sidebar shows "Links"; `/links` renders the empty state.
2. Add `https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc` → form shows cleaned title, description, `VIDEO`, favicon → Save → card appears. DB: `select url, domain, category, "subCategory", "faviconUrl" from "Link";` → `url` without `si=`, `domain = youtube.com`.
3. Same URL again with `#t=10` → "This link is already in your library", no Firecrawl credit spent.
4. `https://github.com/vercel/next.js` → `DEVELOPMENT`; `https://nextjs.org/docs` → `DOCUMENTATION`; a blog post → `ARTICLE`. Change the category before saving; the edit persists.
5. `foo bar` → "Enter a valid http(s) URL" (no request). `https://nonexistent.invalid` → error + "Add manually" → saved with `fetchedAt = null`.
6. Unset `FIRECRAWL_API_KEY`, restart → "Link fetching is not configured…"; manual add still works.
7. Filter chips + search combine; counts update.
8. Card menu: Edit, Refresh metadata (dialog prefilled → Save updates), Copy URL, Delete.
9. Ctrl+K: link titles appear under "Links"; "Add link" lands on `/links?add=1` with the dialog open.
10. A second account sees no links of the first; `links.get` on a foreign id → `NOT_FOUND`.
11. `pnpm tsc --noEmit` and `pnpm build` pass (catches `firecrawl` accidentally imported from a client component).

## 7. Risks

- **Request duration**: Firecrawl (≤ 30 s) + Claude (~3–6 s) in one tRPC call — fine for `next dev`/self-hosted Node; a serverless host with a 10 s cap would need an async flow.
- **Firecrawl SDK error shape** unverified until installed; router catches generically and matches "timeout" in `message` — tighten after install if the SDK exposes a status code.
- **Metadata quality varies** (no favicon/og on some sites; thin markdown on JS-heavy pages) — fallbacks cover it; Google favicon service leaks the domain to Google (swap for `https://icons.duckduckgo.com/ip3/<domain>.ico` if preferred).
- **Credits**: 1 per fetch; duplicate pre-check avoids the common waste; "Refresh metadata" is unthrottled.
- **Enum evolution**: adding a category = schema edit + `db push` + `LINK_CATEGORY_META` entry (TS-enforced); removing one requires re-categorising rows first.
- **URL normalization** could, rarely, alter a URL's meaning (param sorting, trailing slash). If it bites, add an `originalUrl` column.
