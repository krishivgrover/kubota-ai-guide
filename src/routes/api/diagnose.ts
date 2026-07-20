import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  mr: "Marathi (मराठी)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  ta: "Tamil (தமிழ்)",
};

export const Route = createFileRoute("/api/diagnose")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
          const token = authHeader.slice(7);
          if (token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });

          const { imageDataUrl, description, lang } = (await request.json()) as {
            imageDataUrl?: string;
            description?: string;
            lang?: string;
          };
          if (!imageDataUrl?.startsWith("data:image/")) {
            return new Response("Missing or invalid image", { status: 400 });
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const gateway = createLovableAiGatewayProvider(apiKey);
          const model = gateway("google/gemini-3-flash-preview");

          const langName = LANG_NAMES[lang || "en"] || "English";

          const system = `You are an expert Escorts Kubota tractor field service engineer performing a visual diagnosis.

Given a photo of a tractor / farm machine / part / dashboard warning, produce:
1. **What you see** — objective description (make/model if identifiable, part, symptoms).
2. **Likely issues** — ranked list with confidence.
3. **Recommended checks** — numbered troubleshooting steps a technician or owner can perform safely.
4. **Severity** — Low / Medium / High / Safety-critical.
5. **Next step** — book a service appointment, contact dealer, or DIY fix.

If the image is not related to a tractor or farm equipment, say so politely and stop.
Reply entirely in ${langName}. Keep it concise and actionable.`;

          const { text } = await generateText({
            model,
            system,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: description?.trim() || "Please diagnose this tractor / part photo." },
                  { type: "image", image: imageDataUrl },
                ],
              },
            ],
          });

          return new Response(JSON.stringify({ analysis: text }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[api/diagnose]", err);
          const msg = err instanceof Error ? err.message : "Internal error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
