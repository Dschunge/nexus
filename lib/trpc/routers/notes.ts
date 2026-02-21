import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";

export const notesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        folderId: z.string().optional(),
        isArchived: z.boolean().optional().default(false),
        isPinned: z.boolean().optional(),
        isFavorite: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.note.findMany({
        where: {
          userId: ctx.user.id,
          folderId: input.folderId ?? undefined,
          isArchived: input.isArchived,
          isPinned: input.isPinned,
          isFavorite: input.isFavorite,
        },
        include: {
          tags: { include: { tag: true } },
        },
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      });
    }),

  recents: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.note.findMany({
      where: { userId: ctx.user.id, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, updatedAt: true },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          tags: { include: { tag: true } },
          folder: true,
        },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });
      return note;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().default("Untitled"),
        folderId: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.note.create({
        data: {
          title: input.title,
          content: input.content ?? "",
          folderId: input.folderId ?? null,
          userId: ctx.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        isPinned: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        isFavorite: z.boolean().optional(),
        folderId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.prisma.note.findFirst({
        where: { id, userId: ctx.user.id },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      // Save version snapshot when content changes
      if (data.content !== undefined && data.content !== existing.content) {
        await ctx.prisma.noteVersion.create({
          data: { noteId: id, content: existing.content },
        });
      }

      return ctx.prisma.note.update({
        where: { id },
        data: {
          ...data,
          folderId: data.folderId === null ? null : data.folderId,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.note.delete({ where: { id: input.id } });
      return { success: true };
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const results = await ctx.prisma.$queryRaw<
        Array<{ id: string; title: string; content: string; updatedAt: Date }>
      >`
        SELECT id, title, content, "updatedAt"
        FROM "Note"
        WHERE "userId" = ${ctx.user.id}
          AND "isArchived" = false
          AND to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${input.query})
        ORDER BY "updatedAt" DESC
        LIMIT 20
      `;
      return results;
    }),

  versions: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.prisma.note.findFirst({
        where: { id: input.noteId, userId: ctx.user.id },
      });
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.noteVersion.findMany({
        where: { noteId: input.noteId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }),
});
