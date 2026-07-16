import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ComingSoon } from "./chat";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/roles";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/complaints")({
  head: () => ({ meta: [{ title: "Complaints · Escorts Kubota AI" }] }),
  component: ComplaintsPage,
});

function ComplaintsPage() {
  const { roles } = useAuth();
  const priority: AppRole[] = ["admin", "service_engineer", "dealer", "customer"];
  const role = priority.find((p) => roles.includes(p)) ?? "customer";
  return (
    <DashboardShell role={role}>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Complaints & Service Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register, track and resolve service tickets with AI-assisted triage.
        </p>
      </div>
      <ComingSoon icon={MessageSquare} title="Ticket lifecycle coming in Phase 3" body="Full complaint registration with photo upload, AI image diagnosis, severity triage, engineer assignment, status tracking, and audit trail." />
    </DashboardShell>
  );
}
