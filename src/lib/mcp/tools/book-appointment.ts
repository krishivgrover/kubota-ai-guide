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
  name: "book_appointment",
  title: "Book a service appointment",
  description:
    "Create a new service appointment for the signed-in customer. Status starts as 'requested' and staff will confirm.",
  inputSchema: {
    serviceType: z.string().trim().min(2).describe("e.g. 'Routine service', 'Engine diagnostics'."),
    scheduledAt: z
      .string()
      .describe("ISO 8601 date-time when the service should happen (e.g. 2026-08-01T10:00:00Z)."),
    address: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ serviceType, scheduledAt, address, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const iso = new Date(scheduledAt);
    if (Number.isNaN(iso.getTime())) {
      return { content: [{ type: "text", text: "Invalid scheduledAt date" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("service_appointments")
      .insert({
        customer_id: ctx.getUserId(),
        service_type: serviceType,
        scheduled_at: iso.toISOString(),
        address: address ?? null,
        notes: notes ?? null,
      })
      .select("id, service_type, scheduled_at, status")
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [
        {
          type: "text",
          text: `Appointment booked for ${new Date(data.scheduled_at).toLocaleString()} (${data.status}).`,
        },
      ],
      structuredContent: { appointment: data },
    };
  },
});
