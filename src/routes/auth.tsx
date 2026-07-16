import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { APP_ROLES, ROLE_LABELS, roleHome, type AppRole } from "@/lib/roles";
import { Tractor, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
  redirect: z.string().optional(),
  next: z.string().optional(),
});

// Only allow same-origin relative paths as post-auth return targets.
function safeNext(next: string | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · Escorts Kubota AI" },
      { name: "description", content: "Sign in or register for the Escorts Kubota AI Service Assistant." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const next = safeNext(search.next);
      if (next) throw redirect({ href: next });
      throw redirect({ to: "/dashboard" });
    }
  },
});

function AuthPage() {
  const { mode: initialMode, next: nextParam } = Route.useSearch();
  const next = safeNext(nextParam);
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const navigate = useNavigate();

  useEffect(() => setMode(initialMode), [initialMode]);

  // After sign-in/sign-up, land on `next` (a same-origin path from OAuth
  // consent) when present, otherwise the normal dashboard.
  const goPostAuth = () => {
    if (next) window.location.href = next;
    else navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen md:grid-cols-2">
        <aside className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
              <Tractor className="h-5 w-5" />
            </span>
            Escorts Kubota AI
          </Link>
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              The intelligent service floor for modern farm machinery.
            </h2>
            <p className="mt-4 text-sidebar-foreground/70">
              AI-powered diagnostics, grounded answers from your manuals, complaint routing,
              and multilingual support — all in one platform.
            </p>
          </div>
          <p className="text-xs text-sidebar-foreground/50">
            Enterprise-grade · JWT + RBAC · Postgres RLS · RAG
          </p>
        </aside>

        <main className="flex flex-col justify-center px-6 py-12 md:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 md:hidden">
              <Link to="/" className="inline-flex items-center gap-2 font-display text-lg font-semibold">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
                  <Tractor className="h-5 w-5" />
                </span>
                Escorts Kubota AI
              </Link>
            </div>

            <div className="mb-6 inline-flex rounded-lg border border-border bg-surface p-1 text-sm font-medium">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={
                    "rounded-md px-4 py-1.5 transition-colors " +
                    (mode === m
                      ? "bg-background text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to access your dashboard, chat, and service tools."
                : "Choose your role and get started in seconds. Admin access is provisioned separately."}
            </p>

            <button
              type="button"
              onClick={async () => {
                // Ask Google to return to /auth with the same next=, so the
                // beforeLoad above forwards to the consent URL after session hydrates.
                const returnUrl = next
                  ? `${window.location.origin}/auth?next=${encodeURIComponent(next)}`
                  : window.location.origin;
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: returnUrl,
                });
                if (result.error) {
                  toast.error(result.error.message ?? "Google sign-in failed");
                  return;
                }
                if (result.redirected) return;
                goPostAuth();
              }}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border bg-surface-elevated text-sm font-semibold shadow-soft transition-colors hover:bg-secondary"
            >
              <GoogleIcon /> Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or with email
              <span className="h-px flex-1 bg-border" />
            </div>

            {mode === "signin" ? <SignInForm onSuccess={goPostAuth} /> : <SignUpForm onSuccess={goPostAuth} next={next} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Signed in");
        onSuccess();
      }}
    >
      <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} required />
      <Field icon={Lock} label="Password" type="password" value={password} onChange={setPassword} required />
      <Button loading={loading}>Sign in</Button>
    </form>
  );
}

function SignUpForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("customer");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role },
          },
        });
        setLoading(false);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Account created — you can sign in now.");
        navigate({ to: "/dashboard" });
      }}
    >
      <Field icon={UserIcon} label="Full name" type="text" value={fullName} onChange={setFullName} required />
      <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} required />
      <Field icon={Lock} label="Password (min. 8 characters)" type="password" value={password} onChange={setPassword} required minLength={8} />

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          I am a
        </label>
        <div className="grid grid-cols-3 gap-2">
          {APP_ROLES.filter((r) => r !== "admin").map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={
                "rounded-md border px-3 py-2 text-xs font-semibold transition-colors " +
                (role === r
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground")
              }
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Administrator access is provisioned by an existing admin — never through self-signup.
        </p>
      </div>

      <Button loading={loading}>Create account</Button>
    </form>
  );
}

function Field({
  icon: Icon,
  label,
  type,
  value,
  onChange,
  required,
  minLength,
}: {
  icon: typeof Mail;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          value={value}
          required={required}
          minLength={minLength}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none ring-ring focus:ring-2"
        />
      </div>
    </label>
  );
}

function Button({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-glow transition-colors hover:bg-primary-hover disabled:opacity-60"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />} {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.12A6.98 6.98 0 0 1 5.46 12c0-.74.13-1.45.36-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
