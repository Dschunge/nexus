"use client";

import { useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  FileText,
  Pen,
  Code2,
  MessageSquare,
} from "lucide-react";

const AI_COMMANDS = [
  { id: "continue", label: "Continue writing", icon: Pen, description: "Generate the next section" },
  { id: "rewrite", label: "Rewrite", icon: RefreshCw, description: "Improve clarity and style" },
  { id: "summarize", label: "Summarize", icon: FileText, description: "Condense to key points" },
  { id: "explain", label: "Explain", icon: MessageSquare, description: "Explain this text or code" },
  { id: "fixCode", label: "Fix code", icon: Code2, description: "Fix bugs in selected code" },
  { id: "custom", label: "Custom prompt", icon: Sparkles, description: "Write your own instruction" },
] as const;

type CommandId = (typeof AI_COMMANDS)[number]["id"];

interface AICommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  onResult: (result: string) => void;
}

export function AICommandMenu({
  open,
  onOpenChange,
  selectedText,
  onResult,
}: AICommandMenuProps) {
  const trpc = useTRPC();
  const [activeCommand, setActiveCommand] = useState<CommandId | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState("");
  const [instruction, setInstruction] = useState("");

  const rewrite = useMutation(trpc.ai.rewrite.mutationOptions());
  const summarize = useMutation(trpc.ai.summarize.mutationOptions());
  const continueMut = useMutation(trpc.ai.continue.mutationOptions());
  const explain = useMutation(trpc.ai.explain.mutationOptions());
  const fixCode = useMutation(trpc.ai.fixCode.mutationOptions());
  const custom = useMutation(trpc.ai.custom.mutationOptions());

  const isLoading =
    rewrite.isPending ||
    summarize.isPending ||
    continueMut.isPending ||
    explain.isPending ||
    fixCode.isPending ||
    custom.isPending;

  async function runCommand(commandId: CommandId) {
    setActiveCommand(commandId);
    setResult("");
    const text = selectedText || "";
    if (!text.trim() && commandId !== "continue") {
      toast.error("No text selected");
      return;
    }

    try {
      let res: { result: string } | undefined;
      switch (commandId) {
        case "rewrite":
          res = await rewrite.mutateAsync({ text, instruction: instruction || "Improve the writing" });
          break;
        case "summarize":
          res = await summarize.mutateAsync({ text });
          break;
        case "continue":
          res = await continueMut.mutateAsync({ text });
          break;
        case "explain":
          res = await explain.mutateAsync({ text });
          break;
        case "fixCode":
          res = await fixCode.mutateAsync({ text });
          break;
        case "custom":
          if (!customPrompt.trim()) {
            toast.error("Enter a custom prompt");
            return;
          }
          res = await custom.mutateAsync({ text, prompt: customPrompt });
          break;
      }
      if (res) setResult(res.result);
    } catch {
      toast.error("AI request failed");
    }
  }

  function handleAccept() {
    onResult(result);
    handleClose();
  }

  function handleClose() {
    onOpenChange(false);
    setActiveCommand(null);
    setResult("");
    setCustomPrompt("");
    setInstruction("");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            <span
              style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontStyle: "italic" }}
            >
              AI Assistant
            </span>
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            {selectedText && (
              <div className="rounded-lg border border-border/50 bg-muted/50 px-4 py-3 text-sm">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                  Selected text
                </p>
                <p className="line-clamp-3 text-muted-foreground">{selectedText}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {AI_COMMANDS.map((cmd) => {
                const Icon = cmd.icon;
                const isActive = activeCommand === cmd.id && isLoading;
                return (
                  <Button
                    key={cmd.id}
                    variant="outline"
                    className="h-auto justify-start gap-3 border-border/60 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                    disabled={isLoading}
                    onClick={() => {
                      if (cmd.id === "custom") {
                        setActiveCommand("custom");
                      } else {
                        runCommand(cmd.id);
                      }
                    }}
                  >
                    <Icon
                      className={isActive ? "h-4 w-4 shrink-0 animate-spin text-primary" : "h-4 w-4 shrink-0 text-primary/70"}
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium">{cmd.label}</div>
                      <div className="text-xs text-muted-foreground/70">{cmd.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>

            {activeCommand === "custom" && (
              <div className="space-y-2">
                <Textarea
                  placeholder="What should I do with this text?"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  autoFocus
                  className="border-border/60 bg-background/50 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      runCommand("custom");
                    }
                  }}
                />
                <Button
                  onClick={() => runCommand("custom")}
                  disabled={isLoading || !customPrompt.trim()}
                  className="w-full"
                >
                  Run
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="space-y-2 pt-1">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-3/5" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <ScrollArea className="min-h-0 flex-1 rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{result}</p>
            </ScrollArea>
            <div className="flex shrink-0 gap-2">
              <Button onClick={handleAccept} className="flex-1">
                Accept
              </Button>
              <Button
                variant="outline"
                className="border-border/60"
                onClick={() => {
                  setResult("");
                  setActiveCommand(null);
                }}
              >
                Try again
              </Button>
              <Button variant="ghost" onClick={handleClose}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
