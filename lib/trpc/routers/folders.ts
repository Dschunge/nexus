import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { TRPCError } from "@trpc/server";

export const foldersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.folder.findMany({
      where: { userId: ctx.user.id, parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
        _count: { select: { notes: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        parentId: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.folder.create({
        data: {
          name: input.name,
          userId: ctx.user.id,
          parentId: input.parentId ?? null,
          icon: input.icon,
          color: input.color,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        parentId: z.string().nullable().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const folder = await ctx.prisma.folder.findFirst({
        where: { id, userId: ctx.user.id },
      });
      if (!folder) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.folder.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.prisma.folder.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!folder) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.prisma.folder.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
