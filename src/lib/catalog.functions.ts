import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Tractors ----------
export const listTractors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tractors")
      .select("*")
      .order("brand")
      .order("hp");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Dealers ----------
export const listDealers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Non-staff users only see the contact-free dealer directory (no email/phone).
    // Full rows including contact info are restricted to staff by RLS on the base table.
    const { data, error } = await context.supabase
      .from("dealers_directory")
      .select("*")
      .order("region");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Warranties ----------
const warrantyInput = z.object({
  tractorId: z.string().uuid().nullable().optional(),
  serialNumber: z.string().min(2),
  purchaseDate: z.string(), // ISO date
  months: z.number().int().positive().default(24),
  coverage: z.string().optional(),
});

export const listMyWarranties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("warranties")
      .select("*, tractor:tractors(brand,model)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const registerWarranty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => warrantyInput.parse(v))
  .handler(async ({ data, context }) => {
    const start = new Date(data.purchaseDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + data.months);
    const { data: row, error } = await context.supabase
      .from("warranties")
      .insert({
        customer_id: context.userId,
        tractor_id: data.tractorId ?? null,
        serial_number: data.serialNumber,
        purchase_date: data.purchaseDate,
        warranty_end: end.toISOString().slice(0, 10),
        coverage: data.coverage ?? "Standard 24-month powertrain + engine coverage.",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Maintenance ----------
export const listMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ tractorId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("maintenance_schedules")
      .select("*")
      .eq("tractor_id", data.tractorId)
      .order("interval_hours");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- AI Recommender ----------
const recommendInput = z.object({
  budgetInr: z.number().positive().optional(),
  landAcres: z.number().positive().optional(),
  primaryUse: z.string().min(2),
  soilType: z.string().optional(),
  preferBrand: z.string().optional(),
});

export const recommendTractor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => recommendInput.parse(v))
  .handler(async ({ data, context }) => {
    const { data: tractors, error } = await context.supabase.from("tractors").select("*");
    if (error) throw new Error(error.message);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const catalog = (tractors ?? []).map((t) => ({
      id: t.id,
      brand: t.brand,
      model: t.model,
      hp: t.hp,
      price: t.price_inr,
      use_cases: t.use_cases,
      description: t.description,
    }));

    const prompt = `You are a tractor sales expert at Escorts Kubota. Recommend the top 3 tractors from the catalog for this customer.

CUSTOMER NEEDS:
- Budget: ${data.budgetInr ? `₹${data.budgetInr.toLocaleString("en-IN")}` : "flexible"}
- Land: ${data.landAcres ?? "unspecified"} acres
- Primary use: ${data.primaryUse}
- Soil: ${data.soilType ?? "mixed"}
- Preferred brand: ${data.preferBrand ?? "any"}

CATALOG:
${JSON.stringify(catalog, null, 2)}

Return STRICT JSON:
{"recommendations":[{"id":"<uuid>","score":0-100,"reason":"1-2 sentences"}]}
Order by score desc. Only pick from catalog ids.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`AI recommend failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { recommendations?: Array<{ id: string; score: number; reason: string }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }
    const recs = parsed.recommendations ?? [];
    const byId = new Map((tractors ?? []).map((t) => [t.id, t]));
    return recs
      .map((r) => ({ ...r, tractor: byId.get(r.id) }))
      .filter((r) => r.tractor);
  });
