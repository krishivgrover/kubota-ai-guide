import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Header, Stat, ActionCard } from "./customer";
import { Bot, Wrench, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/engineer")({
  head: () => ({ meta: [{ title: "Engineer console · Escorts Kubota AI" }] }),
  component: EngineerDash,
});

function EngineerDash() {
  return (
    <DashboardShell role="service_engineer">
      <Header title="Engineer console" subtitle="Diagnose faster with AI + manuals + past cases." />
      <div className="grid gap-6 md:grid-cols-3">
        <Stat label="Assigned tickets" value="0" />
        <Stat label="Resolved (30d)" value="0" />
        <Stat label="Avg. TTR" value="—" />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <ActionCard to="/dashboard/chat" icon={Bot} title="Diagnostic AI" body="Describe symptoms — the AI cites the exact manual page and suggests next steps." />
        <ActionCard to="/dashboard/complaints" icon={Wrench} title="My tickets" body="Your assigned service tickets with photos, history, and location." />
        <ActionCard to="/dashboard/complaints" icon={MessageSquare} title="Escalations" body="Escalate to L2 support with full context in one click." />
      </div>
    </DashboardShell>
  );
}
