import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquare, CalendarClock, BookOpen, Users, Tractor, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  head: () => ({ meta: [{ title: "Analytics · Escorts Kubota AI" }] }),
  component: AnalyticsPage,
});

type Counts = {
  tickets: number;
  tickets_open: number;
  appointments: number;
  appointments_upcoming: number;
  documents: number;
  chunks: number;
  warranties: number;
  dealers: number;
  users: number;
  ticketsByStatus: Record<string, number>;
  ticketsByPriority: Record<string, number>;
};

async function loadCounts(): Promise<Counts> {
  const safeCount = async (table: string, filter?: (q: any) => any) => {
    try {
      let q = (supabase as any).from(table).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count } = await q;
      return count ?? 0;
    } catch {
      return 0;
    }
  };
  const [tickets, appointments, documents, chunks, warranties, dealers, users] = await Promise.all([
    safeCount("tickets"),
    safeCount("service_appointments"),
    safeCount("documents"),
    safeCount("document_chunks"),
    safeCount("warranties"),
    safeCount("dealers"),
    safeCount("profiles"),
  ]);
  const tickets_open = await safeCount("tickets", (q: any) => q.in("status", ["open", "in_progress", "triaged"]));
  const appointments_upcoming = await safeCount("service_appointments", (q: any) =>
    q.in("status", ["requested", "scheduled", "in_progress"]),
  );

  // group by status/priority for tickets
  const ticketsByStatus: Record<string, number> = {};
  const ticketsByPriority: Record<string, number> = {};
  try {
    const { data } = await supabase.from("tickets").select("status,priority").limit(1000);
    for (const row of data ?? []) {
      const s = (row as any).status ?? "unknown";
      const p = (row as any).priority ?? "unknown";
      ticketsByStatus[s] = (ticketsByStatus[s] ?? 0) + 1;
      ticketsByPriority[p] = (ticketsByPriority[p] ?? 0) + 1;
    }
  } catch {}

  return {
    tickets, tickets_open, appointments, appointments_upcoming,
    documents, chunks, warranties, dealers, users,
    ticketsByStatus, ticketsByPriority,
  };
}

function AnalyticsPage() {
  const { t } = useLang();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCounts().then((c) => { setCounts(c); setLoading(false); });
  }, []);

  return (
    <DashboardShell role="admin">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("analytics.subtitle")}</p>
      </div>

      {loading || !counts ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading metrics…
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi icon={Users} label="Users" value={counts.users} />
            <Kpi icon={MessageSquare} label="Tickets (open)" value={`${counts.tickets_open} / ${counts.tickets}`} />
            <Kpi icon={CalendarClock} label="Upcoming appts" value={`${counts.appointments_upcoming} / ${counts.appointments}`} />
            <Kpi icon={BookOpen} label="KB chunks" value={counts.chunks} />
            <Kpi icon={BookOpen} label="Documents" value={counts.documents} />
            <Kpi icon={ShieldCheck} label="Warranties" value={counts.warranties} />
            <Kpi icon={Tractor} label="Dealers" value={counts.dealers} />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Breakdown title="Tickets by status" data={counts.ticketsByStatus} />
            <Breakdown title="Tickets by priority" data={counts.ticketsByPriority} />
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs">
                <span className="capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-medium">{v}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
