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
  name: "list_my_tickets",
  title: "List my service tickets",
  description:
    "List complaint / service tickets that belong to the signed-in user (as customer, dealer, or assigned engineer). RLS enforces visibility.",
  inputSchema: {
    status: z
      .enum(["open", "triaged", "in_progress", "resolved", "closed"])
      .optional()
      .describe("Optional status filter."),
    limit: z.number().int().min(1).max(50).default(20).describe("Max tickets to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("tickets")
      .select(
        "id, ticket_number, title, category, priority, status, ai_summary, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { tickets: data ?? [] },
    };
  },
});
