import { z } from "zod";
import { router, protectedProcedure } from "@/lib/trpc/init";
import { getAnthropicClient } from "@/lib/anthropic";

const AI_SYSTEM_PROMPT = `You are a helpful writing assistant embedded in a note-taking app called Nexus.
You help users with their writing by following their instructions precisely.
Be concise and return only the requested content without explanations unless asked.`;

export const aiRouter = router({
  rewrite: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        instruction: z.string().optional().default("Improve the writing"),
      })
    )
    .mutation(async ({ input }) => {
      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: AI_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${input.instruction}:\n\n${input.text}`,
          },
        ],
      });
      const content = message.content[0];
      return { result: content.type === "text" ? content.text : "" };
    }),

  summarize: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: AI_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Summarize the following text concisely (2-4 sentences):\n\n${input.text}`,
          },
        ],
      });
      const content = message.content[0];
      return { result: content.type === "text" ? content.text : "" };
    }),

  continue: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: AI_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Continue writing from where this text ends. Match the style and tone:\n\n${input.text}`,
          },
        ],
      });
      const content = message.content[0];
      return { result: content.type === "text" ? content.text : "" };
    }),

  explain: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: AI_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Explain the following text or code clearly:\n\n${input.text}`,
          },
        ],
      });
      const content = message.content[0];
      return { result: content.type === "text" ? content.text : "" };
    }),

  fixCode: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: AI_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Fix any bugs in the following code and return only the corrected code:\n\n${input.text}`,
          },
        ],
      });
      const content = message.content[0];
      return { result: content.type === "text" ? content.text : "" };
    }),

  chat: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find relevant notes via full-text search
      let sources = await ctx.prisma.$queryRaw<
        Array<{ id: string; title: string; content: string }>
      >`
        SELECT id, title, content
        FROM "Note"
        WHERE "userId" = ${ctx.user.id}
          AND "isArchived" = false
          AND to_tsvector('english', title || ' ' || content)
              @@ plainto_tsquery('english', ${input.question})
        ORDER BY "updatedAt" DESC
        LIMIT 6
      `;

      // Fall back to recent notes when query returns nothing
      if (sources.length === 0) {
        sources = await ctx.prisma.note.findMany({
          where: { userId: ctx.user.id, isArchived: false },
          orderBy: { updatedAt: "desc" },
          take: 6,
          select: { id: true, title: true, content: true },
        });
      }

      const context = sources
        .map((n) => {
          const text = n.content
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 600);
          return `[Note: "${n.title}"]\n${text}`;
        })
        .join("\n\n---\n\n");

      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: `You are a helpful assistant for a note-taking app. Answer the user's questions using only the notes provided as context. Be concise and cite the note titles when referencing specific information. If the answer isn't in the notes, say so.`,
        messages: [
          ...input.history.map((h) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          {
            role: "user" as const,
            content: `My notes:\n\n${context}\n\nQuestion: ${input.question}`,
          },
        ],
      });

      const raw = message.content[0];
      const answer = raw.type === "text" ? raw.text : "";

      // Return all searched notes as sources so the user can visit them
      return {
        answer,
        sources: sources.map((s) => ({ id: s.id, title: s.title })),
      };
    }),

  custom: protectedProcedure
    .input(z.object({ text: z.string(), prompt: z.string() }))
    .mutation(async ({ input }) => {
      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: AI_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${input.prompt}:\n\n${input.text}`,
          },
        ],
      });
      const content = message.content[0];
      return { result: content.type === "text" ? content.text : "" };
    }),
});
