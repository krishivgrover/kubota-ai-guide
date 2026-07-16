import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, embedTexts } from "@/lib/ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Body = { messages?: UIMessage[] };

const SYSTEM = `You are the Escorts Kubota AI Service Assistant.

You help customers, dealers, and service engineers with:
- Tractor product recommendations, EMI, warranty, and maintenance
- Troubleshooting and service procedures from official manuals
- Complaint and service-ticket triage

Rules:
- ALWAYS ground technical answers in the provided context when it is present. Cite sources inline as [Doc:<title> p.<page>].
- If the context is empty or off-topic, say so briefly and answer from general knowledge while noting it is not from the manual.
- Prefer numbered steps for procedures. Include torque values, part numbers, and safety warnings verbatim when they appear.
- Never invent part numbers, model specs, or warranty terms.
- Keep answers concise but complete. Reply in the user's language (English / Hindi).`;

async function extractLastUserText(messages: UIMessage[]): Promise<string> {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  const parts = (last as any).parts as Array<{ type: string; text?: string }> | undefined;
  if (parts) return parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join(" ").trim();
  const content = (last as any).content;
  if (typeof content === "string") return content;
  return "";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Auth: verify the caller has a Supabase bearer token.
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response("Unauthorized", { status: 401 });
          }
          const token = authHeader.slice(7);
          if (token.split(".").length !== 3) {
            return new Response("Unauthorized", { status: 401 });
          }

          const body = (await request.json()) as Body;
          const messages = body.messages;
          if (!Array.isArray(messages)) {
            return new Response("Messages are required", { status: 400 });
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          // Retrieve relevant chunks for the latest user message.
          const query = await extractLastUserText(messages);
          let contextBlock = "";
          if (query) {
            try {
              const [qVec] = await embedTexts(apiKey, [query], "openai/text-embedding-3-small");
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const { data: matches } = await supabaseAdmin.rpc("match_document_chunks", {
                query_embedding: qVec as unknown as string,
                match_count: 6,
              });
              if (matches && matches.length > 0) {
                const ids = Array.from(new Set(matches.map((m: any) => m.document_id)));
                const { data: docs } = await supabaseAdmin
                  .from("documents")
                  .select("id,title")
                  .in("id", ids);
                const titleById = new Map((docs ?? []).map((d: any) => [d.id, d.title as string]));
                contextBlock = matches
                  .map((m: any, i: number) => {
                    const title = titleById.get(m.document_id) ?? "Manual";
                    return `[${i + 1}] Doc: ${title} p.${m.page ?? "?"} (sim=${m.similarity.toFixed(2)})\n${m.content}`;
                  })
                  .join("\n\n---\n\n");
              }
            } catch (e) {
              console.error("[chat] retrieval failed", e);
            }
          }

          const systemWithContext =
            SYSTEM +
            (contextBlock
              ? `\n\n---\nRetrieved context from manuals:\n\n${contextBlock}`
              : "\n\n---\n(No matching manual context found for this query.)");

          const gateway = createLovableAiGatewayProvider(apiKey);
          const model = gateway("google/gemini-3-flash-preview");

          const result = streamText({
            model,
            system: systemWithContext,
            messages: convertToModelMessages(messages),
          });

          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (err) {
          console.error("[api/chat] error", err);
          const msg = err instanceof Error ? err.message : "Internal error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
