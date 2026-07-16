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
  name: "create_ticket",
  title: "Register a service complaint",
  description:
    "Create a new complaint / service ticket for the signed-in user. AI triage runs automatically in the app; this tool records the raw complaint.",
  inputSchema: {
    title: z.string().trim().min(3).describe("Short summary of the issue."),
    description: z.string().trim().min(10).describe("Detailed description of the problem."),
    category: z
      .enum([
        "engine",
        "hydraulics",
        "electrical",
        "transmission",
        "warranty",
        "delivery",
        "other",
      ])
      .default("other"),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description, category, priority }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        customer_id: ctx.getUserId(),
        title,
        description,
        category,
        priority,
      })
      .select("id, ticket_number, status, category, priority")
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [
        { type: "text", text: `Ticket ${data.ticket_number} created (status: ${data.status}).` },
      ],
      structuredContent: { ticket: data },
    };
  },
});
