import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (v: string | undefined) => void = () => {};
  let done = false;
  const ready = new Promise<string | undefined>((r) => (resolveRunId = r));
  const publish = (v?: string) => {
    const nx = v?.trim() || undefined;
    if (!runId && nx) runId = nx;
    if (!done) {
      done = true;
      resolveRunId(runId);
    }
  };
  if (runId) publish(runId);
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      try {
        const res = await fetch(input, { ...init, headers });
        publish(res.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
        return res;
      } catch (e) {
        publish(undefined);
        throw e;
      }
    },
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : ready),
  };
}

export function createLovableAiGatewayProvider(apiKey: string, initialRunId?: string) {
  const rf = createLovableAiGatewayRunIdFetch(initialRunId);
  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: rf.fetch as typeof fetch,
  });
  return Object.assign(provider, { getRunId: rf.getRunId, waitForRunId: rf.waitForRunId });
}

/** Direct call to the OpenAI-compatible /v1/embeddings endpoint on the Lovable AI Gateway. */
export async function embedTexts(
  apiKey: string,
  inputs: string[],
  model = "openai/text-embedding-3-small",
): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({ model, input: inputs }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Embeddings failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> };
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
