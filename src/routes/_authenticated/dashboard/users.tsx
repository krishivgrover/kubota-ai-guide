import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ComingSoon } from "./chat";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/users")({
  head: () => ({ meta: [{ title: "Users & roles · Escorts Kubota AI" }] }),
  component: () => (
    <DashboardShell role="admin">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Users & roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">Grant or revoke customer, dealer, engineer and admin permissions.</p>
      </div>
      <ComingSoon icon={Users} title="RBAC management coming in Phase 3" body="Search users, view their assigned roles, and grant / revoke roles via server functions guarded by the has_role() admin check." />
    </DashboardShell>
  ),
});
