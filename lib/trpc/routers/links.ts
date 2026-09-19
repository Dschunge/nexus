import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { LINK_CATEGORIES, type LinkCategory } from "@/lib/links/categories";
import { InvalidUrlError, normalizeUrl } from "@/lib/links/normalizeUrl";
import {
  fetchAndClassify,
  MAX_STORED_CONTENT_CHARS,
  ScrapeFailedError,
} from "@/lib/links/fetchAndClassify";
import { FirecrawlNotConfiguredError, FirecrawlSdkError } from "@/lib/firecrawl";

const linkFields = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).default(""),
  category: z.enum(LINK_CATEGORIES),
  subCategory: z.string().trim().max(60).nullable().optional(),
  faviconUrl: z.url().nullable().optional(),
  ogImageUrl: z.url().nullable().optional(),
  siteName: z.string().max(200).nullable().optional(),
  content: z.string().max(MAX_STORED_CONTENT_CHARS).optional(),
  fetchedAt: z.date().nullable().optional(),
});

const DUPLICATE_MESSAGE = "This link is already in your library";

function parseUrlOrThrow(raw: string) {
  try {
    return normalizeUrl(raw);
  } catch (error) {
    if (error instanceof InvalidUrlError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}

// Maps everything that can go wrong while fetching a page to a code + message
// the dialog can show as-is.
function toFetchError(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;
  if (error instanceof FirecrawlNotConfiguredError) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Link fetching is not configured (FIRECRAWL_API_KEY missing)",
    });
  }
  if (error instanceof ScrapeFailedError) {
    return new TRPCError({ code: "BAD_GATEWAY", message: error.message });
  }
  const message = error instanceof Error ? error.message : String(error);
  const status = error instanceof FirecrawlSdkError ? error.status : undefined;
  if (status === 408 || /timeout|timed out/i.test(message)) {
    return new TRPCError({
      code: "TIMEOUT",
      message: "The page took too long to load",
    });
  }
  console.error("Link fetch failed:", error);
  return new TRPCError({
    code: "BAD_GATEWAY",
    message: "Could not fetch this page",
  });
}

export const linksRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        category: z.enum(LINK_CATEGORIES).optional(),
        search: z.string().trim().max(200).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const search = input.search?.trim();
      const searchFields = [
        "title",
        "description",
        "domain",
        "subCategory",
        "content",
      ] as const;
      return ctx.prisma.link.findMany({
        where: {
          userId: ctx.user.id,
          category: input.category,
          ...(search
            ? {
                OR: searchFields.map((field) => ({
                  [field]: { contains: search, mode: "insensitive" as const },
                })),
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  counts: protectedProcedure.query(async ({ ctx }) => {
    const groups = await ctx.prisma.link.groupBy({
      by: ["category"],
      where: { userId: ctx.user.id },
      _count: { _all: true },
    });
    const byCategory = Object.fromEntries(
      LINK_CATEGORIES.map((c) => [c, 0])
    ) as Record<LinkCategory, number>;
    let total = 0;
    for (const g of groups) {
      byCategory[g.category] = g._count._all;
      total += g._count._all;
    }
    return { total, byCategory };
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const link = await ctx.prisma.link.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });
      return link;
    }),

  // Mutation, not query: every call spends a Firecrawl credit.
  preview: protectedProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const normalized = parseUrlOrThrow(input.url);
      const existing = await ctx.prisma.link.findFirst({
        where: { url: normalized.url, userId: ctx.user.id },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: DUPLICATE_MESSAGE });
      }
      try {
        return await fetchAndClassify(normalized);
      } catch (error) {
        throw toFetchError(error);
      }
    }),

  create: protectedProcedure
    .input(linkFields.extend({ url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { url: rawUrl, ...fields } = input;
      const normalized = parseUrlOrThrow(rawUrl);
      try {
        return await ctx.prisma.link.create({
          data: {
            ...fields,
            url: normalized.url,
            domain: normalized.domain,
            userId: ctx.user.id,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({ code: "CONFLICT", message: DUPLICATE_MESSAGE });
        }
        throw error;
      }
    }),

  update: protectedProcedure
    .input(linkFields.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const link = await ctx.prisma.link.findFirst({
        where: { id, userId: ctx.user.id },
      });
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.link.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const link = await ctx.prisma.link.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.link.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // Re-runs the fetch for an existing link without saving; the client opens
  // the edit form prefilled so the user can accept or discard the result.
  refetch: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const link = await ctx.prisma.link.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        select: { url: true, domain: true },
      });
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });
      try {
        return await fetchAndClassify(link);
      } catch (error) {
        throw toFetchError(error);
      }
    }),
});
