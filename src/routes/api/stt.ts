import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof Blob)) return new Response("file required", { status: 400 });
        if (file.size < 512) return new Response("recording too short", { status: 400 });

        const type = (file as File).type || "audio/webm";
        const extMap: Record<string, string> = {
          "audio/webm": "webm",
          "audio/mp4": "mp4",
          "audio/mpeg": "mp3",
          "audio/wav": "wav",
          "audio/ogg": "ogg",
        };
        const ext = extMap[type.split(";")[0]] ?? "webm";

        const upstreamForm = new FormData();
        upstreamForm.append("model", "openai/gpt-4o-mini-transcribe");
        upstreamForm.append("file", file, `recording.${ext}`);

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstreamForm,
        });
        if (!upstream.ok) {
          return new Response(await upstream.text(), { status: upstream.status });
        }
        const data = await upstream.json();
        return Response.json({ text: data.text ?? "" });
      },
    },
  },
});
