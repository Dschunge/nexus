"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, X, Send, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; title: string }[];
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trpc = useTRPC();

  const chat = useMutation(
    trpc.ai.chat.mutationOptions({
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer, sources: data.sources },
        ]);
      },
      onError: () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't process that. Please try again.",
          },
        ]);
      },
    })
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chat.isPending]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  function handleSend() {
    const q = input.trim();
    if (!q || chat.isPending) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    chat.mutate({ question: q, history });
  }

  return (
    <>
      {/* Floating toggle button — only shown when panel is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
          title="Chat with your notes"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}

      {/* Slide-in panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-30 flex h-full w-95 flex-col border-l border-border/50 bg-background/95 shadow-2xl backdrop-blur-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Chat with Notes
          </span>
          <div className="ml-auto flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-foreground/80 hover:text-foreground"
                title="Clear conversation"
                onClick={() => setMessages([])}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-foreground/80 hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {messages.length === 0 ? (
            <div className="mt-16 space-y-2 text-center">
              <p className="text-lg text-foreground">
                Ask anything about your notes.
              </p>
              <p className="text-xs text-foreground/60">
                &ldquo;What did I write about X?&rdquo; &middot; &ldquo;Summarize my notes on Y&rdquo;
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted/60 text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <>
                        <Separator className="my-2 opacity-20" />
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-xs opacity-60">Sources:</span>
                          {msg.sources.map((s) => (
                            <Link
                              key={s.id}
                              href={`/notes/${s.id}`}
                              onClick={() => setOpen(false)}
                            >
                              <Badge
                                variant="secondary"
                                className="cursor-pointer rounded-full text-xs hover:bg-primary/10 hover:text-primary"
                              >
                                {s.title || "Untitled"}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {chat.isPending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-muted/60 px-4 py-2.5 text-sm text-foreground/70">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border/40 p-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about your notes…"
              className="max-h-32 min-h-10 resize-none border-border bg-card text-sm text-foreground placeholder:text-foreground/40 focus-visible:border-primary focus-visible:ring-primary/20"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || chat.isPending}
              className="shrink-0 disabled:opacity-100 disabled:cursor-default"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-foreground/50">
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>
    </>
  );
}
