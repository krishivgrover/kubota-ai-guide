import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const IngestInput = z.object({
  documentId: z.string().uuid(),
});

const StartInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  storagePath: z.string().min(1),
});

const DeleteInput = z.object({ id: z.string().uuid() });

// Chunk plain text into ~1000-char slices with 150-char overlap.
function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    out.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return out;
}

async function assertStaff(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.some((r: string) => r === "admin" || r === "dealer" || r === "service_engineer")) {
    throw new Error("Forbidden: staff role required");
  }
}

/** Register a newly uploaded PDF (row in `documents`). */
export const registerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StartInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({
        title: data.title,
        description: data.description,
        storage_path: data.storagePath,
        status: "pending",
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/** List documents for the knowledge base UI. */
export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id,title,description,status,page_count,error,created_at,storage_path")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Delete a document (admin only) and its chunks + storage file. */
export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error: dErr } = await context.supabase
      .from("documents")
      .select("storage_path")
      .eq("id", data.id)
      .single();
    if (dErr) throw new Error(dErr.message);
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (doc?.storage_path) {
      await context.supabase.storage.from("manuals").remove([doc.storage_path]);
    }
    return { ok: true };
  });

/** Parse a stored PDF, chunk it, embed the chunks, and persist them. */
export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IngestInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // Server-only modules loaded inside the handler.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { embedTexts } = await import("./ai-gateway.server");
    const { extractText, getDocumentProxy } = await import("unpdf");

    const { data: doc, error: dErr } = await supabaseAdmin
      .from("documents")
      .select("id,storage_path,status")
      .eq("id", data.documentId)
      .single();
    if (dErr || !doc) throw new Error(dErr?.message ?? "Document not found");

    await supabaseAdmin.from("documents").update({ status: "processing", error: null }).eq("id", doc.id);

    try {
      const { data: file, error: fErr } = await supabaseAdmin.storage
        .from("manuals")
        .download(doc.storage_path);
      if (fErr || !file) throw new Error(fErr?.message ?? "Storage download failed");
      const buf = new Uint8Array(await file.arrayBuffer());

      const pdf = await getDocumentProxy(buf);
      const pageCount = pdf.numPages;

      // Extract per-page so we can attach page numbers to chunks.
      type Piece = { text: string; page: number };
      const pieces: Piece[] = [];
      const { text } = await extractText(pdf, { mergePages: false });
      const pages = Array.isArray(text) ? text : [String(text)];
      pages.forEach((pageText, idx) => {
        for (const c of chunkText(pageText)) {
          pieces.push({ text: c, page: idx + 1 });
        }
      });

      if (pieces.length === 0) throw new Error("No extractable text in PDF");

      // Wipe any prior chunks for a clean re-ingest.
      await supabaseAdmin.from("document_chunks").delete().eq("document_id", doc.id);

      // Embed in batches of 64.
      const batchSize = 64;
      let inserted = 0;
      for (let i = 0; i < pieces.length; i += batchSize) {
        const batch = pieces.slice(i, i + batchSize);
        const vectors = await embedTexts(
          apiKey,
          batch.map((p) => p.text),
          "openai/text-embedding-3-small",
        );
        const rows = batch.map((p, k) => ({
          document_id: doc.id,
          chunk_index: i + k,
          content: p.text,
          page: p.page,
          token_count: Math.ceil(p.text.length / 4),
          embedding: vectors[k] as unknown as string, // pgvector accepts array serialization
        }));
        const { error: insErr } = await supabaseAdmin.from("document_chunks").insert(rows as any);
        if (insErr) throw new Error(insErr.message);
        inserted += rows.length;
      }

      await supabaseAdmin
        .from("documents")
        .update({ status: "ready", page_count: pageCount })
        .eq("id", doc.id);

      return { ok: true, chunks: inserted, pages: pageCount };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabaseAdmin.from("documents").update({ status: "failed", error: msg }).eq("id", doc.id);
      throw new Error(msg);
    }
  });
