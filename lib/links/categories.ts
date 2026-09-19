import { LinkCategory } from "@/lib/generated/prisma/enums";

export { LinkCategory };

// Tuple form so it can feed z.enum() and the Claude tool schema directly.
export const LINK_CATEGORIES = Object.values(LinkCategory) as [
  LinkCategory,
  ...LinkCategory[],
];

// Labels drive the UI; descriptions are reused verbatim in the classifier
// prompt. Record<LinkCategory, …> makes TS fail if the Prisma enum changes
// without this map being updated.
export const LINK_CATEGORY_META: Record<
  LinkCategory,
  { label: string; description: string }
> = {
  DEVELOPMENT: {
    label: "Development",
    description:
      "Source code repositories, packages, libraries, code snippets, GitHub/GitLab",
  },
  DOCUMENTATION: {
    label: "Documentation",
    description: "Official docs, API references, manuals, specifications",
  },
  ARTICLE: {
    label: "Article",
    description: "Blog posts, news, essays, opinion pieces",
  },
  VIDEO: {
    label: "Video",
    description: "YouTube, Vimeo, talks, screencasts, streams",
  },
  TOOL: {
    label: "Tool",
    description: "Web apps, SaaS products, online utilities, services",
  },
  DESIGN: {
    label: "Design",
    description: "UI/UX resources, inspiration, icons, fonts, Figma, Dribbble",
  },
  LEARNING: {
    label: "Learning",
    description: "Courses, tutorials, guides, how-tos, MOOCs",
  },
  SOCIAL: {
    label: "Social",
    description: "Social media posts/profiles, forums, Reddit, X, discussions",
  },
  SHOPPING: {
    label: "Shopping",
    description: "Products, stores, marketplaces, price pages",
  },
  OTHER: {
    label: "Other",
    description: "Anything that fits none of the above",
  },
};
