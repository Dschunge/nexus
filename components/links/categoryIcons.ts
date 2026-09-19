import {
  BookOpen,
  Code2,
  GraduationCap,
  Link2,
  MessageCircle,
  Newspaper,
  Palette,
  ShoppingCart,
  Video,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { LinkCategory } from "@/lib/links/categories";

// Kept apart from lib/links/categories.ts so the server module stays free of
// icon imports.
export const CATEGORY_ICONS: Record<LinkCategory, LucideIcon> = {
  DEVELOPMENT: Code2,
  DOCUMENTATION: BookOpen,
  ARTICLE: Newspaper,
  VIDEO: Video,
  TOOL: Wrench,
  DESIGN: Palette,
  LEARNING: GraduationCap,
  SOCIAL: MessageCircle,
  SHOPPING: ShoppingCart,
  OTHER: Link2,
};
