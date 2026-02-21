"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface WikiLinkItem {
  id: string;
  title: string;
}

export interface WikiLinkMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface WikiLinkMenuProps {
  items: WikiLinkItem[];
  command: (item: WikiLinkItem) => void;
}

const WikiLinkMenu = forwardRef<WikiLinkMenuRef, WikiLinkMenuProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          if (items[selectedIndex]) {
            command(items[selectedIndex]);
          }
          return true;
        }
        return false;
      },
    }));

    return (
      <div className="z-50 w-64 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
        <div className="border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Link to note
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {items.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No notes found
            </div>
          ) : (
            items.map((item, index) => (
              <button
                key={item.id}
                className={cn(
                  "flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-left",
                  "hover:bg-accent hover:text-accent-foreground",
                  index === selectedIndex && "bg-accent text-accent-foreground"
                )}
                onClick={() => command(item)}
              >
                {item.title}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }
);

WikiLinkMenu.displayName = "WikiLinkMenu";

export { WikiLinkMenu };
