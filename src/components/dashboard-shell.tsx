import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { Bot, LayoutDashboard, LogOut, MessageSquare, Tractor, Wrench, Users, ShieldCheck, BookOpen, CalendarClock, Camera, BarChart3, Globe } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLang, LANGUAGES } from "@/lib/i18n";

interface Props {
  role: AppRole;
  children: React.ReactNode;
}

export function DashboardShell({ role, children }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang, setLang } = useLang();

  const navByRole: Record<AppRole, { to: string; label: string; icon: typeof Bot }[]> = {
    customer: [
      { to: "/dashboard/customer", label: t("nav.overview"), icon: LayoutDashboard },
      { to: "/dashboard/chat", label: t("nav.assistant"), icon: Bot },
      { to: "/dashboard/diagnose", label: t("nav.diagnose"), icon: Camera },
      { to: "/dashboard/complaints", label: t("nav.complaints"), icon: MessageSquare },
      { to: "/dashboard/appointments", label: t("nav.appointments"), icon: CalendarClock },
      { to: "/dashboard/recommend", label: t("nav.recommend"), icon: Tractor },
    ],
    dealer: [
      { to: "/dashboard/dealer", label: t("nav.overview"), icon: LayoutDashboard },
      { to: "/dashboard/chat", label: t("nav.assistant"), icon: Bot },
      { to: "/dashboard/diagnose", label: t("nav.diagnose"), icon: Camera },
      { to: "/dashboard/complaints", label: t("nav.tickets"), icon: MessageSquare },
      { to: "/dashboard/appointments", label: t("nav.appointments"), icon: CalendarClock },
    ],
    service_engineer: [
      { to: "/dashboard/engineer", label: t("nav.overview"), icon: LayoutDashboard },
      { to: "/dashboard/chat", label: "Diagnostic AI", icon: Bot },
      { to: "/dashboard/diagnose", label: t("nav.diagnose"), icon: Camera },
      { to: "/dashboard/complaints", label: "My tickets", icon: Wrench },
      { to: "/dashboard/appointments", label: t("nav.appointments"), icon: CalendarClock },
    ],
    admin: [
      { to: "/dashboard/admin", label: t("nav.overview"), icon: LayoutDashboard },
      { to: "/dashboard/analytics", label: t("nav.analytics"), icon: BarChart3 },
      { to: "/dashboard/chat", label: t("nav.assistant"), icon: Bot },
      { to: "/dashboard/knowledge", label: t("nav.knowledge"), icon: BookOpen },
      { to: "/dashboard/users", label: t("nav.users"), icon: Users },
    ],
  };

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5 font-display text-base font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
            <Tractor className="h-4 w-4" />
          </span>
          Escorts Kubota AI
        </Link>
        <div className="mt-4 flex-1 space-y-0.5 px-3">
          {navByRole[role].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
        <div className="border-t border-sidebar-border p-4 space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground/75">
            <Globe className="h-3.5 w-3.5" /> {t("common.language")}
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1.5 text-xs text-sidebar-foreground focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-background text-foreground">
                {l.native}
              </option>
            ))}
          </select>
          <div className="text-xs">
            <div className="truncate font-medium text-sidebar-foreground">{user?.email}</div>
            <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <ShieldCheck className="h-3 w-3" /> {ROLE_LABELS[role]}
            </div>
          </div>
          <button
            onClick={async () => {
              await queryClient.cancelQueries();
              queryClient.clear();
              await supabase.auth.signOut();
              toast.success("Signed out");
              navigate({ to: "/auth", replace: true });
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-sidebar-border px-3 py-2 text-xs font-semibold text-sidebar-foreground/85 hover:bg-sidebar-accent"
          >
            <LogOut className="h-3.5 w-3.5" /> {t("common.signout")}
          </button>
        </div>
      </aside>
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
      </main>
    </div>
  );
}
