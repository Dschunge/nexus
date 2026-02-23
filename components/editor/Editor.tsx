"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Bold, Italic, Link2, Sparkles } from "lucide-react";
import { AICommandMenu } from "./AICommandMenu";
import { Toolbar } from "./Toolbar";
import { SlashCommand } from "./SlashCommandExtension";
import { slashCommandSuggestion } from "./SlashCommandRenderer";
import { WikiLinkNode } from "./WikiLinkExtension";
import { WikiLinkSuggestion } from "./WikiLinkSuggestionExtension";
import { wikiLinkSuggestion } from "./WikiLinkRenderer";

const lowlight = createLowlight(common);

interface EditorProps {
  noteId: string;
  initialContent: string;
  onContentChange?: (content: string) => void;
}

interface SelectionPos {
  top: number;
  left: number;
}

export function Editor({ noteId, initialContent, onContentChange }: EditorProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [bubblePos, setBubblePos] = useState<SelectionPos | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const updateNote = useMutation(
    trpc.notes.update.mutationOptions({
      onSuccess: () => {
        setIsSaving(false);
        queryClient.invalidateQueries(trpc.notes.recents.queryOptions());
        queryClient.invalidateQueries(trpc.notes.backlinks.queryOptions({ noteId }));
      },
      onError: () => {
        setIsSaving(false);
        toast.error("Failed to save note");
      },
    })
  );

  const debouncedSave = useCallback(
    (content: string) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      setIsSaving(true);
      saveTimeout.current = setTimeout(() => {
        updateNote.mutate({ id: noteId, content });
      }, 1000);
    },
    [noteId, updateNote]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "plaintext",
      }),
      Placeholder.configure({
        placeholder: "Start writing… (type / for commands)",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-4 cursor-pointer" },
      }),
      Image.configure({ inline: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: true }),
      SlashCommand.configure({ suggestion: slashCommandSuggestion }),
      WikiLinkNode,
      WikiLinkSuggestion.configure({ suggestion: wikiLinkSuggestion }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-base dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-10rem)] px-10 py-6",
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onContentChange?.(content);
      debouncedSave(content);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasText = from !== to;
      setHasSelection(hasText);

      if (hasText && containerRef.current) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          setBubblePos({
            top: rect.top - containerRect.top - 48,
            left: Math.max(0, rect.left - containerRect.left + rect.width / 2 - 96),
          });
        }
      } else {
        setBubblePos(null);
      }
    },
  });

  // Ctrl+J to open AI menu
  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        const { from, to } = editor.state.selection;
        const text = editor.state.doc.textBetween(from, to, " ");
        setSelectedText(text || editor.getText());
        setAiMenuOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor]);

  const handleAIResult = useCallback(
    (result: string) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from !== to) {
        editor.chain().focus().deleteSelection().insertContent(result).run();
      } else {
        editor.chain().focus().insertContent(result).run();
      }
    },
    [editor]
  );

  if (!editor) return null;

  const wordCount = editor.storage.characterCount?.words() ?? 0;

  return (
    <div className="relative flex h-full flex-col" ref={containerRef}>
      {/* Bubble toolbar — pill shaped */}
      {bubblePos && hasSelection && editor && (
        <div
          className="absolute z-20 flex items-center gap-0.5 rounded-full border border-border/50 bg-popover/95 px-2 py-1.5 shadow-2xl backdrop-blur-xl"
          style={{ top: bubblePos.top, left: bubblePos.left }}
        >
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 rounded-full p-0 transition-colors",
              editor.isActive("bold") && "bg-primary/15 text-primary"
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleBold().run();
            }}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 rounded-full p-0 transition-colors",
              editor.isActive("italic") && "bg-primary/15 text-primary"
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleItalic().run();
            }}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 rounded-full p-0 transition-colors",
              editor.isActive("link") && "bg-primary/15 text-primary"
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              const url = prompt("URL:");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
          >
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <div className="mx-0.5 h-4 w-px bg-border/60" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 rounded-full p-0 text-primary transition-colors hover:bg-primary/15"
            onMouseDown={(e) => {
              e.preventDefault();
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to, " ");
              setSelectedText(text);
              setAiMenuOpen(true);
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Persistent toolbar */}
      <Toolbar editor={editor} />

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-border/40 px-8 py-1.5 text-xs">
        <span className="italic text-foreground/50">
          {isSaving ? "Saving…" : ""}
        </span>
        <span className="tabular-nums text-foreground/70">
          {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
        </span>
      </div>

      {/* AI Command Menu */}
      <AICommandMenu
        open={aiMenuOpen}
        onOpenChange={setAiMenuOpen}
        selectedText={selectedText}
        onResult={handleAIResult}
      />
    </div>
  );
}
