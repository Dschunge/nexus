import { LinkCategory } from "@/lib/generated/prisma/enums";

export { LinkCategory };

// Display order for the filter chips and the category select, and the tuple
// that feeds z.enum() and the Claude tool schema. Listed explicitly rather
// than taken from the enum: the Prisma enum is append-only (see the comment
// in schema.prisma), so a new category would otherwise always land last.
// The check below fails the build if a value is missing here.
const CATEGORY_ORDER = [
  LinkCategory.DEVELOPMENT,
  LinkCategory.DOCUMENTATION,
  LinkCategory.ARTICLE,
  LinkCategory.VIDEO,
  LinkCategory.TOOL,
  LinkCategory.DESIGN,
  LinkCategory.THREE_D_PRINTING,
  LinkCategory.LEARNING,
  LinkCategory.SOCIAL,
  LinkCategory.SHOPPING,
  LinkCategory.OTHER,
] as const;

// Fails to compile if a category is missing from CATEGORY_ORDER.
type MissingCategory = Exclude<LinkCategory, (typeof CATEGORY_ORDER)[number]>;
const _everyCategoryListed: [MissingCategory] extends [never] ? true : never =
  true;
void _everyCategoryListed;

export const LINK_CATEGORIES = [...CATEGORY_ORDER] as [
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
  THREE_D_PRINTING: {
    label: "3D Printing",
    description:
      "3D printable models and model repositories (Printables, Thingiverse, MakerWorld, Thangs), 3D printers and parts, filament and resin, slicers and 3D-printing guides",
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
