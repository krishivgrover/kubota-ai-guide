import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tractor } from "lucide-react";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthResult = {
  data?: {
    client?: { name?: string } | null;
    redirect_url?: string;
    redirect_to?: string;
    scope?: string;
  } | null;
  error?: { message: string } | null;
};
const authOauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { mode: "signin", next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await authOauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md rounded-xl border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold text-destructive">Authorization error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an app";
  const scopes = (details?.scope ?? "openid email profile").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await authOauth.approveAuthorization(authorization_id)
      : await authOauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen grid place-items-center bg-surface p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
            <Tractor className="h-4 w-4" />
          </span>
          Escorts Kubota AI
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Connect {clientName} to your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {clientName} will be able to call this app's enabled tools while you are signed in.
        </p>

        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Requested access</div>
          <ul className="mt-2 space-y-1">
            {scopes.map((s) => (
              <li key={s}>• {friendlyScope(s)}</li>
            ))}
            <li>• Use enabled tools (tickets, appointments, warranties, catalog) as you</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            This does not bypass this app's permissions or backend policies.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 inline-flex h-11 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 inline-flex h-11 items-center justify-center rounded-md border border-border font-semibold hover:bg-muted disabled:opacity-60"
          >
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}

function friendlyScope(s: string): string {
  switch (s) {
    case "openid":
      return "Verify your identity";
    case "email":
      return "Share your email address";
    case "profile":
      return "Share your basic profile";
    default:
      return `Additional permission requested: ${s}`;
  }
}
