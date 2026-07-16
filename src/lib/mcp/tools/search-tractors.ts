import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_tractors",
  title: "Search the tractor catalog",
  description:
    "Search Escorts Kubota (Farmtrac / Powertrac) tractors by HP range, budget, or brand.",
  inputSchema: {
    minHp: z.number().int().optional(),
    maxHp: z.number().int().optional(),
    maxPriceInr: z.number().int().optional(),
    brand: z.string().optional().describe("e.g. 'Farmtrac', 'Powertrac'"),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ minHp, maxHp, maxPriceInr, brand, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("tractors")
      .select("id, brand, model, hp, price_inr, use_cases, description")
      .order("hp")
      .limit(limit);
    if (typeof minHp === "number") q = q.gte("hp", minHp);
    if (typeof maxHp === "number") q = q.lte("hp", maxHp);
    if (typeof maxPriceInr === "number") q = q.lte("price_inr", maxPriceInr);
    if (brand) q = q.ilike("brand", brand);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { tractors: data ?? [] },
    };
  },
});
