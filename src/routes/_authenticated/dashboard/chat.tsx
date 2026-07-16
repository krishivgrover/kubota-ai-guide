import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, User, Loader2, Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/chat")({
  head: () => ({ meta: [{ title: "AI Assistant · Escorts Kubota AI" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { roles } = useAuth();
  const priority: AppRole[] = ["admin", "service_engineer", "dealer", "customer"];
  const role = priority.find((p) => roles.includes(p)) ?? "customer";

  return (
    <DashboardShell role={role}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">AI Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grounded answers from your product manuals and service knowledge base.
        </p>
      </div>
      <ChatWindow />
    </DashboardShell>
  );
}

function ChatWindow() {
  const [input, setInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setToken(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const transport = useMemo(() => {
    if (!token) return undefined;
    return new DefaultChatTransport({
      api: "/api/chat",
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [token]);

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (e) => console.error("[chat] error", e),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !transport) return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching manuals and thinking…
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error.message}
          </div>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-border bg-background/60 p-4">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder="Ask about tractor maintenance, torque specs, warranty, EMI…"
          className="min-h-[52px] resize-none"
          disabled={!transport}
        />
        <Button type="submit" disabled={isLoading || !input.trim() || !transport} className="self-end">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = (message.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:mb-2 prose-ol:my-2 prose-ul:my-2">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const samples = [
    "What is the oil change interval for the Farmtrac 60?",
    "Explain the warranty coverage for the hydraulic system.",
    "EMI for a ₹9,50,000 tractor at 9.5% over 5 years?",
    "Steps to troubleshoot a tractor that won't start.",
  ];
  return (
    <div className="mx-auto max-w-2xl py-10 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold">Ask the Escorts Kubota AI Assistant</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Answers are grounded in your uploaded manuals via vector search. Try one:
      </p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {samples.map((s) => (
          <div key={s} className="rounded-lg border border-border bg-background p-3 text-left text-xs text-muted-foreground">
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComingSoon({ icon: Icon = Construction, title, body }: { icon?: typeof Bot; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-soft">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-6 font-display text-xl font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
