import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";
import { getAnthropicClient } from "@/lib/anthropic";

export const tagsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.tag.findMany({
      where: { userId: ctx.user.id },
      include: { _count: { select: { notes: true } } },
      orderBy: { name: "asc" },
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.tag.upsert({
        where: { name_userId: { name: input.name, userId: ctx.user.id } },
        create: { name: input.name, userId: ctx.user.id },
        update: {},
      });
    }),

  attachToNote: protectedProcedure
    .input(z.object({ noteId: z.string(), tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.noteId, userId: ctx.user.id },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.noteTag.upsert({
        where: { noteId_tagId: { noteId: input.noteId, tagId: input.tagId } },
        create: { noteId: input.noteId, tagId: input.tagId },
        update: {},
      });
    }),

  detachFromNote: protectedProcedure
    .input(z.object({ noteId: z.string(), tagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.noteTag.delete({
        where: { noteId_tagId: { noteId: input.noteId, tagId: input.tagId } },
      });
      return { success: true };
    }),

  suggest: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.noteId, userId: ctx.user.id },
        include: { tags: { include: { tag: true } } },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });

      const existingNames = note.tags.map((nt) => nt.tag.name);
      const plainText = note.content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 800);

      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `Suggest 3-5 short, relevant tags for this note. Return ONLY a JSON array of lowercase strings, no explanation, no markdown.
Already tagged: ${existingNames.length ? existingNames.join(", ") : "none"}.
Title: ${note.title}
Content: ${plainText}`,
          },
        ],
      });

      const raw = message.content[0];
      if (raw.type !== "text") return [];
      try {
        // Extract the first JSON array found in the response
        const match = raw.text.match(/\[[\s\S]*?\]/);
        if (!match) return [];
        const parsed = JSON.parse(match[0]) as unknown;
        if (!Array.isArray(parsed)) return [];
        const suggestions = (parsed as unknown[])
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.toLowerCase().trim())
          .filter((s) => s.length > 0 && !existingNames.includes(s));
        return suggestions.slice(0, 5);
      } catch {
        return [];
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.prisma.tag.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!tag) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.tag.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
