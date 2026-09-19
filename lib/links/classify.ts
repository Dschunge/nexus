import { z } from "zod";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  LINK_CATEGORIES,
  LINK_CATEGORY_META,
  type LinkCategory,
} from "@/lib/links/categories";

export interface ClassifyInput {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  markdown: string;
}

export interface Classification {
  title: string;
  description: string;
  category: LinkCategory;
  subCategory: string | null;
}

const MAX_CONTENT_CHARS = 3000;

const CLASSIFY_TOOL: Tool = {
  name: "classify_link",
  description:
    "Record the cleaned-up title, a short description, the category and a sub-category for a saved web link.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Clean human-readable title without site suffixes such as ' | GitHub' or ' - YouTube'. Max 120 characters.",
      },
      description: {
        type: "string",
        description:
          "One or two neutral sentences describing what the page is. Max 300 characters.",
      },
      category: {
        type: "string",
        enum: LINK_CATEGORIES,
        description: LINK_CATEGORIES.map(
          (c) => `${c}: ${LINK_CATEGORY_META[c].description}`,
        ).join("\n"),
      },
      subCategory: {
        type: "string",
        description:
          "Short free-text sub-category of 2-3 words, e.g. 'TypeScript library', 'Conference talk', 'Cooking tutorial'. Empty string if none fits.",
      },
    },
    required: ["title", "description", "category", "subCategory"],
  },
};

// Defensive check on the tool input: tool-use guarantees the shape, but
// lengths and empty strings are still worth normalising.
const classificationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300),
  category: z.enum(LINK_CATEGORIES),
  subCategory: z.string().trim().max(40),
});

/**
 * Asks Claude to classify a scraped page. Uses forced tool-use so the reply
 * is a structurally valid object with the category constrained to the enum.
 * Throws on any failure; fetchAndClassify decides how to degrade.
 */
export async function classifyLink(
  input: ClassifyInput,
): Promise<Classification> {
  const content = input.markdown
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CONTENT_CHARS);

  const message = await getAnthropicClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: "classify_link" },
    messages: [
      {
        role: "user",
        content: `You classify a web link for a personal bookmarks library. Base everything on the information below and never invent facts that are not present.

URL: ${input.url}
Domain: ${input.domain}
Page title: ${input.title ?? "(none)"}
Meta description: ${input.description ?? "(none)"}
Site name: ${input.siteName ?? "(none)"}

Main content (truncated):
${content || "(no content extracted)"}`,
      },
    ],
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block) throw new Error("Claude returned no tool_use block");

  const parsed = classificationSchema.parse(block.input);
  return {
    ...parsed,
    subCategory: parsed.subCategory || null,
  };
}
