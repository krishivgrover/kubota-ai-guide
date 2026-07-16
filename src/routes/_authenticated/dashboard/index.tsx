import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { roleHome, type AppRole } from "@/lib/roles";

// Root of the authenticated area — redirect to the correct role-specific home.
export const Route = createFileRoute("/_authenticated/dashboard/")({
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sess.session.user.id);
    const roles = (data ?? []).map((r) => r.role as AppRole);
    // Priority: admin > engineer > dealer > customer
    const priority: AppRole[] = ["admin", "service_engineer", "dealer", "customer"];
    const chosen = priority.find((p) => roles.includes(p)) ?? "customer";
    throw redirect({ to: roleHome(chosen) });
  },
  component: () => null,
});
