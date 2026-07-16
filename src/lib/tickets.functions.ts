import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CATEGORIES = ["engine", "hydraulics", "electrical", "transmission", "body", "implement", "other"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;
const STATUSES = ["open", "triaged", "assigned", "in_progress", "resolved", "closed"] as const;

const CreateInput = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(4000),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  model: z.string().max(120).optional(),
  serial_no: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
});

const IdInput = z.object({ id: z.string().uuid() });
const StatusInput = z.object({ id: z.string().uuid(), status: z.enum(STATUSES) });
const AssignInput = z.object({
  id: z.string().uuid(),
  engineer_id: z.string().uuid().nullable().optional(),
  dealer_id: z.string().uuid().nullable().optional(),
});
const MessageInput = z.object({
  ticket_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
  is_internal: z.boolean().default(false),
});

async function aiTriage(
  apiKey: string,
  title: string,
  description: string,
): Promise<{ category: (typeof CATEGORIES)[number]; priority: (typeof PRIORITIES)[number]; summary: string }> {
  const prompt = `You are a service dispatcher for Escorts Kubota tractors.
Classify this incoming complaint. Respond ONLY with a compact JSON object:
{"category": one of ${JSON.stringify(CATEGORIES)},
 "priority": one of ${JSON.stringify(PRIORITIES)},
 "summary": "one sentence, max 160 chars"}

Title: ${title}
Description: ${description}`;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const j = await res.json();
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const category = (CATEGORIES as readonly string[]).includes(parsed.category) ? parsed.category : "other";
    const priority = (PRIORITIES as readonly string[]).includes(parsed.priority) ? parsed.priority : "medium";
    const summary = String(parsed.summary ?? "").slice(0, 200);
    return { category, priority, summary };
  } catch (e) {
    console.error("[triage] failed", e);
    return { category: "other", priority: "medium", summary: "" };
  }
}

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    const triage = apiKey ? await aiTriage(apiKey, data.title, data.description) : null;

    const insert = {
      customer_id: context.userId,
      title: data.title,
      description: data.description,
      category: data.category ?? triage?.category ?? "other",
      priority: data.priority ?? triage?.priority ?? "medium",
      model: data.model ?? null,
      serial_no: data.serial_no ?? null,
      location: data.location ?? null,
      ai_summary: triage?.summary ?? null,
      ai_priority: triage?.priority ?? null,
      status: triage ? "triaged" : "open",
    };

    const { data: row, error } = await context.supabase
      .from("tickets")
      .insert(insert as any)
      .select("id,ticket_no")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS already scopes to what the caller can see.
    const { data, error } = await context.supabase
      .from("tickets")
      .select(
        "id,ticket_no,title,category,priority,status,model,location,customer_id,dealer_id,engineer_id,ai_summary,created_at,updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("tickets")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const { data: messages, error: mErr } = await context.supabase
      .from("ticket_messages")
      .select("id,body,is_internal,sender_id,created_at")
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    // Look up display names for participants + message senders.
    const ids = new Set<string>();
    if (ticket.customer_id) ids.add(ticket.customer_id);
    if (ticket.engineer_id) ids.add(ticket.engineer_id);
    if (ticket.dealer_id) ids.add(ticket.dealer_id);
    for (const m of messages ?? []) ids.add(m.sender_id);
    let profiles: Record<string, { full_name: string | null }> = {};
    if (ids.size > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", Array.from(ids));
      profiles = Object.fromEntries((profs ?? []).map((p: any) => [p.id, { full_name: p.full_name }]));
    }

    return { ticket, messages: messages ?? [], profiles };
  });

export const addTicketMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MessageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ticket_messages")
      .insert({
        ticket_id: data.ticket_id,
        sender_id: context.userId,
        body: data.body,
        is_internal: data.is_internal,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "resolved" || data.status === "closed") {
      patch.resolved_at = new Date().toISOString();
    }
    const { error } = await context.supabase.from("tickets").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AssignInput.parse(d))
  .handler(async ({ data, context }) => {
    // Only staff should assign. Check via has_role RPC.
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId } as any);
    if (!staff) throw new Error("Forbidden: staff only");

    const patch: Record<string, unknown> = {};
    if ("engineer_id" in data) patch.engineer_id = data.engineer_id ?? null;
    if ("dealer_id" in data) patch.dealer_id = data.dealer_id ?? null;
    if (patch.engineer_id) patch.status = "assigned";

    const { error } = await context.supabase.from("tickets").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Staff directory for the assignment picker. */
export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: staffRows, error } = await context.supabase
      .from("user_roles")
      .select("user_id,role")
      .in("role", ["dealer", "service_engineer"]);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((staffRows ?? []).map((r: any) => r.user_id)));
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", ids);
    const nameById = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
    return (staffRows ?? []).map((r: any) => ({
      user_id: r.user_id,
      role: r.role,
      full_name: nameById[r.user_id] ?? "Unnamed",
    }));
  });
