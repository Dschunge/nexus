"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import type { Editor, Range } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Minus,
  Text,
  Table2,
  Highlighter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (opts: { editor: Editor; range: Range }) => void;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: "Text",
    description: "Plain paragraph",
    icon: <Text className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: <Heading1 className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet list",
    description: "Unordered list",
    icon: <List className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "Ordered list",
    icon: <ListOrdered className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    description: "Checkboxes",
    icon: <CheckSquare className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Blockquote",
    description: "Quoted text",
    icon: <Quote className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    title: "Code block",
    description: "Syntax-highlighted code",
    icon: <Code2 className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    icon: <Minus className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Table",
    description: "3×3 table",
    icon: <Table2 className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Highlight",
    description: "Highlighted text",
    icon: <Highlighter className="h-4 w-4" />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleHighlight().run(),
  },
];

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
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

    if (items.length === 0) return null;

    return (
      <div className="z-50 w-64 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
        <div className="max-h-72 overflow-y-auto p-1">
          {items.map((item, index) => (
            <button
              key={item.title}
              className={cn(
                "flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-left",
                "hover:bg-accent hover:text-accent-foreground",
                index === selectedIndex && "bg-accent text-accent-foreground"
              )}
              onClick={() => command(item)}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground">
                {item.icon}
              </span>
              <div>
                <div className="font-medium leading-none">{item.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {item.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
);

SlashCommandMenu.displayName = "SlashCommandMenu";

export { SlashCommandMenu };
