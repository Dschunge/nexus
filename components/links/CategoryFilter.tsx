"use client";

import { Badge } from "@/components/ui/badge";
import {
  LINK_CATEGORIES,
  LINK_CATEGORY_META,
  type LinkCategory,
} from "@/lib/links/categories";
import { CATEGORY_ICONS } from "@/components/links/categoryIcons";

interface Props {
  value: LinkCategory | null;
  onChange: (value: LinkCategory | null) => void;
  counts?: Record<LinkCategory, number>;
  total: number;
}

// Same chip pattern as the tag filter in the sidebar.
export function CategoryFilter({ value, onChange, counts, total }: Props) {
  const chipClass = "cursor-pointer rounded-full text-xs font-normal";
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        variant={value === null ? "default" : "secondary"}
        className={chipClass}
        onClick={() => onChange(null)}
      >
        All
        <span className="ml-1 opacity-60">{total}</span>
      </Badge>
      {LINK_CATEGORIES.filter((c) => (counts?.[c] ?? 0) > 0).map((c) => {
        const Icon = CATEGORY_ICONS[c];
        return (
          <Badge
            key={c}
            variant={value === c ? "default" : "secondary"}
            className={chipClass}
            onClick={() => onChange(value === c ? null : c)}
          >
            <Icon className="mr-1 h-3 w-3" />
            {LINK_CATEGORY_META[c].label}
            <span className="ml-1 opacity-60">{counts?.[c]}</span>
          </Badge>
        );
      })}
    </div>
  );
}
