import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Bot, MessageSquare, Tractor, Wrench, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/customer")({
  head: () => ({ meta: [{ title: "Customer dashboard · Escorts Kubota AI" }] }),
  component: CustomerDash,
});

function CustomerDash() {
  return (
    <DashboardShell role="customer">
      <Header title="Welcome back" subtitle="Your AI-powered service floor." />
      <div className="grid gap-6 md:grid-cols-3">
        <Stat label="Open complaints" value="0" />
        <Stat label="Scheduled service" value="—" />
        <Stat label="Warranty status" value="Active" positive />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <ActionCard
          to="/dashboard/chat"
          icon={Bot}
          title="Ask the AI assistant"
          body="Diagnose issues, look up manuals, or get maintenance tips in Hindi or English."
        />
        <ActionCard
          to="/dashboard/complaints"
          icon={MessageSquare}
          title="Register a complaint"
          body="Report an issue with photos. Our AI triages and routes to a nearby engineer."
        />
        <ActionCard
          to="/dashboard/recommend"
          icon={Tractor}
          title="Find the right tractor"
          body="Answer a few questions — we'll match you to the perfect Farmtrac or Powertrac model."
        />
        <ActionCard
          to="/dashboard/appointments"
          icon={Wrench}
          title="Book a service appointment"
          body="Schedule maintenance with an authorised dealer or engineer and get live status updates."
        />
      </div>
    </DashboardShell>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={
          "mt-2 font-display text-3xl font-bold " +
          (positive ? "text-success" : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}

export function ActionCard({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: typeof Bot;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}
