import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ComingSoon } from "./chat";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge base · Escorts Kubota AI" }] }),
  component: () => (
    <DashboardShell role="admin">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Knowledge base</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload manuals, service bulletins and FAQs for RAG retrieval.</p>
      </div>
      <ComingSoon icon={BookOpen} title="PDF ingestion coming in Phase 2" body="Drag-and-drop PDF upload → chunk → embed via Lovable AI (Gemini embeddings) → store in pgvector. Then answers cite the exact source page." />
    </DashboardShell>
  ),
});
