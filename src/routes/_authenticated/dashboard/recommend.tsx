import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ComingSoon } from "./chat";
import { Tractor } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/recommend")({
  head: () => ({ meta: [{ title: "Find a tractor · Escorts Kubota AI" }] }),
  component: () => (
    <DashboardShell role="customer">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Find the right tractor</h1>
        <p className="mt-1 text-sm text-muted-foreground">Answer a few questions and we'll match you to the perfect model.</p>
      </div>
      <ComingSoon icon={Tractor} title="Recommender coming in Phase 4" body="AI recommender across Farmtrac / Powertrac / Kubota range, EMI calculator, warranty checker, and nearby-dealer locator." />
    </DashboardShell>
  ),
});
