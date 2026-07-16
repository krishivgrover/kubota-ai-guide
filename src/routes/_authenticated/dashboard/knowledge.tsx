import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { listDocuments, registerDocument, ingestDocument, deleteDocument } from "@/lib/ingest.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Upload, FileText, Trash2, Loader2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge base · Escorts Kubota AI" }] }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const { roles } = useAuth();
  const priority: AppRole[] = ["admin", "service_engineer", "dealer", "customer"];
  const role = priority.find((p) => roles.includes(p)) ?? "customer";
  const canManage = roles.some((r) => r === "admin" || r === "dealer" || r === "service_engineer");

  return (
    <DashboardShell role={role}>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Knowledge base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload PDF manuals, service bulletins and FAQs. They are chunked, embedded (Gemini/OpenAI via Lovable AI Gateway),
            and stored in pgvector for retrieval-augmented answers.
          </p>
        </div>
      </div>

      {canManage ? <Uploader /> : (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Only staff (admin, dealer, service engineer) can upload manuals. You can still browse the current knowledge base below.
        </div>
      )}

      <div className="mt-8">
        <DocumentList canManage={canManage} />
      </div>
    </DashboardShell>
  );
}

function Uploader() {
  const qc = useQueryClient();
  const registerFn = useServerFn(registerDocument);
  const ingestFn = useServerFn(ingestDocument);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setFile(null);
    setProgress("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setBusy(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      setProgress("Uploading PDF…");
      const { error: upErr } = await supabase.storage.from("manuals").upload(path, file, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;

      setProgress("Registering document…");
      const { id } = await registerFn({ data: { title: title.trim(), description: description.trim() || undefined, storagePath: path } });

      setProgress("Extracting text and building embeddings…");
      const result = await ingestFn({ data: { documentId: id } });

      toast.success(`Ingested "${title}" · ${result.chunks} chunks across ${result.pages} pages`);
      reset();
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
        <Upload className="h-4 w-4 text-primary" /> Upload a PDF manual
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Farmtrac 60 Operator Manual" required />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">PDF file</label>
          <Input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Product line, model years, or notes for search"
            rows={2}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{busy ? progress : "PDF is parsed, chunked, and embedded in-place."}</div>
        <Button type="submit" disabled={busy || !file || !title.trim()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {busy ? "Ingesting…" : "Upload & ingest"}
        </Button>
      </div>
    </form>
  );
}

function DocumentList({ canManage }: { canManage: boolean }) {
  const listFn = useServerFn(listDocuments);
  const ingestFn = useServerFn(ingestDocument);
  const deleteFn = useServerFn(deleteDocument);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => listFn(),
    refetchInterval: 10000,
  });

  const reingest = useMutation({
    mutationFn: (id: string) => ingestFn({ data: { documentId: id } }),
    onSuccess: () => {
      toast.success("Re-ingest complete");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No manuals yet. Upload a PDF above to seed the knowledge base.</p>
      </div>
    );
  }

  const statusColor = (s: string) =>
    s === "ready" ? "default" : s === "failed" ? "destructive" : "secondary";

  return (
    <div className="space-y-2">
      {data.map((d: any) => (
        <div key={d.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <FileText className="h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate font-medium text-foreground">{d.title}</div>
              <Badge variant={statusColor(d.status) as any}>{d.status}</Badge>
              {d.page_count ? <span className="text-xs text-muted-foreground">{d.page_count} pages</span> : null}
            </div>
            {d.description ? <div className="truncate text-xs text-muted-foreground">{d.description}</div> : null}
            {d.error ? <div className="mt-1 text-xs text-destructive">{d.error}</div> : null}
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => reingest.mutate(d.id)} disabled={reingest.isPending}>
                <RefreshCw className={`h-4 w-4 ${reingest.isPending ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => del.mutate(d.id)} disabled={del.isPending}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
