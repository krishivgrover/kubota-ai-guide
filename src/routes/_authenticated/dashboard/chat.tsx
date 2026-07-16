import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/roles";
import { Bot, Construction } from "lucide-react";

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
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">AI Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grounded answers from your product manuals and service knowledge base.
        </p>
      </div>
      <ComingSoon
        icon={Bot}
        title="RAG-powered chat coming in Phase 2"
        body="This is where the streaming chat UI, PDF ingestion, and vector-search grounded answers will live. The database (with pgvector) and Lovable AI Gateway key are already wired — Phase 2 adds the /api/chat route, embeddings pipeline, and message rendering with citations."
      />
    </DashboardShell>
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
