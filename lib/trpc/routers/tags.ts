import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";

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
