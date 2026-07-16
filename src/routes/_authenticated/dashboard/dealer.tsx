import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Header, Stat, ActionCard } from "./customer";
import { Bot, MessageSquare, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/dealer")({
  head: () => ({ meta: [{ title: "Dealer dashboard · Escorts Kubota AI" }] }),
  component: DealerDash,
});

function DealerDash() {
  return (
    <DashboardShell role="dealer">
      <Header title="Dealer console" subtitle="Manage leads, service tickets and your local knowledge." />
      <div className="grid gap-6 md:grid-cols-3">
        <Stat label="Active leads" value="0" />
        <Stat label="Open tickets" value="0" />
        <Stat label="This week" value="—" />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <ActionCard to="/dashboard/chat" icon={Bot} title="Dealer AI assistant" body="Quick answers on specs, pricing, and warranty policies grounded in official documents." />
        <ActionCard to="/dashboard/complaints" icon={MessageSquare} title="Service tickets" body="View incoming complaints in your region and assign engineers." />
        <ActionCard to="/dashboard/dealer" icon={Users} title="Customers" body="Coming soon: customer CRM and follow-ups." />
      </div>
    </DashboardShell>
  );
}
