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
