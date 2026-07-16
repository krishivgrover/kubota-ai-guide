import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  Wrench,
  BookOpen,
  Users,
  ShieldCheck,
  Languages,
  ArrowRight,
  Tractor,
  Cpu,
  MapPin,
  Sparkles,
} from "lucide-react";
import heroImg from "@/assets/hero-tractor.jpg";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, APP_ROLES } from "@/lib/roles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Escorts Kubota AI Service Assistant — Enterprise AI for Farm Machinery" },
      {
        name: "description",
        content:
          "AI-powered service platform for Escorts Kubota. Diagnose tractors, browse manuals with RAG, register complaints, and get multilingual support — for customers, dealers, engineers, and admins.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Trust />
      <Features />
      <Roles />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container-app flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground shadow-glow">
            <Tractor className="h-5 w-5" />
          </span>
          <span>
            Escorts Kubota <span className="text-primary">AI</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#roles" className="hover:text-foreground">For Teams</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-app grid gap-10 py-20 md:grid-cols-2 md:py-28 md:gap-16">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Retrieval-Augmented AI · Powered by Escorts Kubota knowledge
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            The intelligent service floor for{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              modern farm machinery
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            One AI assistant that reads your manuals, diagnoses tractor issues,
            recommends the right implement, and routes complaints — for every
            customer, dealer, engineer, and administrator. Hindi and English.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow transition-colors hover:bg-primary-hover"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex h-11 items-center rounded-md border border-border bg-surface-elevated px-6 text-sm font-semibold text-foreground shadow-soft hover:bg-secondary"
            >
              See how it works
            </a>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6">
            {[
              ["12+", "Modules"],
              ["2", "Languages"],
              ["24/7", "AI on call"],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="font-display text-2xl font-bold text-foreground">{v}</dt>
                <dd className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-accent opacity-20 blur-3xl" aria-hidden />
          <div className="relative overflow-hidden rounded-2xl border border-border shadow-elevated">
            <img
              src={heroImg}
              alt="Escorts Kubota tractor at sunrise in Indian farmland"
              width={1600}
              height={900}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/10 bg-black/40 p-4 text-white backdrop-blur">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/80">
                <Bot className="h-3.5 w-3.5" /> Live AI diagnosis
              </div>
              <p className="mt-1 text-sm leading-snug">
                "Engine cranks but does not start after monsoon. Check fuel filter clog and
                battery voltage — nearest service centre: Ballabhgarh, 12 km."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const items = [
    { icon: ShieldCheck, label: "JWT + RBAC" },
    { icon: Cpu, label: "RAG over PDFs" },
    { icon: Languages, label: "Hindi + English" },
    { icon: MapPin, label: "Dealer locator" },
  ];
  return (
    <section className="border-y border-border bg-surface">
      <div className="container-app grid grid-cols-2 gap-6 py-6 md:grid-cols-4">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <Icon className="h-4 w-4 text-primary" />
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: Bot,
      title: "AI chat with conversation memory",
      body: "Grounded answers from your product manuals, service bulletins and FAQ — never hallucinated.",
    },
    {
      icon: BookOpen,
      title: "PDF ingestion & semantic search",
      body: "Upload manuals. We chunk, embed, and store in pgvector so answers cite the exact page.",
    },
    {
      icon: Wrench,
      title: "Complaint & ticket lifecycle",
      body: "Register with photos, AI triages severity, engineers work the queue with a full audit trail.",
    },
    {
      icon: Tractor,
      title: "Tractor & implement recommender",
      body: "Match customers to Farmtrac / Powertrac / Kubota models by farm size, crop, budget, EMI.",
    },
    {
      icon: Languages,
      title: "Voice & multilingual",
      body: "Speech-to-text, text-to-speech, Hindi + English — built for the real Indian service floor.",
    },
    {
      icon: ShieldCheck,
      title: "Enterprise security",
      body: "Role-based access, row-level policies, encrypted secrets, JWT auth, audit logs.",
    },
  ];
  return (
    <section id="features" className="py-24">
      <div className="container-app">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Built for the entire service value chain
          </h2>
          <p className="mt-4 text-muted-foreground">
            Not a chatbot bolted onto a website. A production platform that plugs into your
            knowledge base, your dealer network, and your engineering workflow.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roles() {
  const icons: Record<string, typeof Users> = {
    customer: Tractor,
    dealer: Users,
    service_engineer: Wrench,
    admin: ShieldCheck,
  };
  return (
    <section id="roles" className="border-y border-border bg-surface py-24">
      <div className="container-app">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            One platform. Four purpose-built experiences.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every persona sees exactly what they need — and nothing they shouldn't. Role-based
            access control powered by Postgres row-level security.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {APP_ROLES.map((role) => {
            const Icon = icons[role] ?? Users;
            return (
              <div
                key={role}
                className="rounded-xl border border-border bg-card p-6 shadow-soft"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {ROLE_LABELS[role]}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Ingest your knowledge",
      body: "Upload PDF manuals, service bulletins, and FAQ docs. We chunk, embed, and index.",
    },
    {
      n: "02",
      title: "Ask in natural language",
      body: "Customers, dealers and engineers ask questions in English or Hindi. AI retrieves relevant chunks.",
    },
    {
      n: "03",
      title: "Get grounded answers",
      body: "The assistant answers using only your content — with citations, and no hallucinations.",
    },
    {
      n: "04",
      title: "Escalate to humans",
      body: "Complex issues open a service ticket, routed to the right engineer with full context.",
    },
  ];
  return (
    <section id="how" className="py-24">
      <div className="container-app">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            From manual to answer — in seconds
          </h2>
          <p className="mt-4 text-muted-foreground">
            A retrieval-augmented pipeline, not a generic chatbot.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <div className="font-mono text-xs font-semibold text-primary">{s.n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20">
      <div className="container-app">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-10 text-primary-foreground shadow-elevated md:p-16">
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Ready to modernise your service floor?
            </h2>
            <p className="mt-4 text-primary-foreground/85">
              Sign up, invite your team, upload your manuals, and go live in an afternoon.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-background px-6 text-sm font-semibold text-foreground shadow-soft hover:bg-surface"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex h-11 items-center rounded-md border border-primary-foreground/40 px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10"
              >
                Sign in
              </Link>
            </div>
          </div>
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/40 blur-3xl"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="container-app flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} Escorts Kubota Pvt. Ltd. All rights reserved.</p>
        <p className="text-xs">Built with Lovable AI · TanStack Start · Spring Boot</p>
      </div>
    </footer>
  );
}
