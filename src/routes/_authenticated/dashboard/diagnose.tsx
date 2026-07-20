import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Upload, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/diagnose")({
  head: () => ({ meta: [{ title: "Photo diagnosis · Escorts Kubota AI" }] }),
  component: DiagnosePage,
});

function DiagnosePage() {
  const { roles } = useAuth();
  const { t, lang } = useLang();
  const priority: AppRole[] = ["admin", "service_engineer", "dealer", "customer"];
  const role = priority.find((p) => roles.includes(p)) ?? "customer";

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File) => {
    setError(null);
    if (f.size > 8 * 1024 * 1024) {
      setError("Image too large (max 8 MB)");
      return;
    }
    // Downscale for reliable upload
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
    const img = new Image();
    img.src = dataUrl;
    await new Promise((r) => (img.onload = r));
    const max = 1280;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    setImageDataUrl(canvas.toDataURL("image/jpeg", 0.85));
  };

  const analyze = async () => {
    if (!imageDataUrl) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageDataUrl, description, lang }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAnalysis(data.analysis as string);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell role={role}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">{t("diagnose.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("diagnose.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <label className="block text-sm font-medium">{t("diagnose.upload")}</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <div
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/40 hover:border-primary/50 hover:bg-muted"
          >
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="Preview" className="h-full w-full rounded-lg object-contain" />
            ) : (
              <>
                <Camera className="h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Click to select or take a photo</p>
              </>
            )}
          </div>

          <label className="mt-4 block text-sm font-medium">{t("diagnose.describe")}</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Black smoke from exhaust, engine sounds rough…"
            className="mt-2"
            rows={3}
          />

          <div className="mt-4 flex gap-2">
            <Button onClick={() => fileRef.current?.click()} variant="outline" size="sm">
              <Upload className="mr-1 h-4 w-4" /> Change photo
            </Button>
            <Button onClick={analyze} disabled={!imageDataUrl || loading} className="ml-auto">
              {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Camera className="mr-1 h-4 w-4" />}
              {t("diagnose.analyze")}
            </Button>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-semibold">{t("diagnose.result")}</h2>
          {!analysis && !loading && (
            <p className="mt-4 text-sm text-muted-foreground">
              Upload a photo and click analyze — the AI vision model will inspect it and produce a structured diagnosis.
            </p>
          )}
          {loading && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing image…
            </div>
          )}
          {analysis && (
            <div className="prose prose-sm mt-4 max-w-none dark:prose-invert">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
