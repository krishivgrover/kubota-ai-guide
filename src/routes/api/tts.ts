import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { text, voice } = (await request.json()) as { text?: string; voice?: string };
        if (!text || typeof text !== "string") return new Response("text required", { status: 400 });

        const trimmed = text.length > 3500 ? text.slice(0, 3500) : text;
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: trimmed,
            voice: voice ?? "alloy",
            response_format: "mp3",
          }),
        });
        if (!upstream.ok) {
          return new Response(await upstream.text(), { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
