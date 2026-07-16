import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Header, Stat, ActionCard } from "./customer";
import { Bot, BookOpen, Users, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  head: () => ({ meta: [{ title: "Admin console · Escorts Kubota AI" }] }),
  component: AdminDash,
});

function AdminDash() {
  return (
    <DashboardShell role="admin">
      <Header title="Administrator console" subtitle="Users, knowledge base, analytics, audit trail." />
      <div className="grid gap-6 md:grid-cols-4">
        <Stat label="Total users" value="—" />
        <Stat label="Documents" value="0" />
        <Stat label="Tickets (30d)" value="0" />
        <Stat label="AI queries" value="0" />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <ActionCard to="/dashboard/knowledge" icon={BookOpen} title="Knowledge base" body="Upload PDF manuals. Chunks are embedded and stored for RAG retrieval." />
        <ActionCard to="/dashboard/users" icon={Users} title="Users & roles" body="Grant / revoke dealer, engineer and admin permissions." />
        <ActionCard to="/dashboard/chat" icon={Bot} title="AI assistant" body="Test grounded answers and prompt tuning before rollout." />
        <ActionCard to="/dashboard/admin" icon={ShieldCheck} title="Audit trail" body="Coming soon: all admin actions logged and searchable." />
      </div>
    </DashboardShell>
  );
}
