import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// Server-only. Importing this from a client component is a build error
// (via the "server-only" package) so the API key can never leak to the
// browser bundle.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// gemini-2.5-flash is deprecated for new API keys (Google's own 404 error
// points here); gemini-3.7-flash's free quota proved far stricter than
// documented (20 total requests hit instantly). 3.6-flash is what Google's
// API itself recommends as the replacement for 2.5-flash.
export const AI_MODEL = "gemini-3.6-flash";

interface StructuredCallParams<T extends z.ZodTypeAny> {
  system: string;
  prompt: string;
  schema: T;
  toolName: string;
  toolDescription: string;
  maxTokens?: number;
}

// zod's JSON Schema output includes keys ($schema, additionalProperties)
// that Gemini's function-parameter schema doesn't expect. Strip them
// recursively rather than hand-writing a parallel schema per agent.
function sanitizeSchemaForGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeSchemaForGemini);
  if (schema && typeof schema === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
      if (key === "$schema" || key === "additionalProperties") continue;
      out[key] = sanitizeSchemaForGemini(value);
    }
    return out;
  }
  return schema;
}

function getRetryDelayMs(err: unknown): number | null {
  const statusCode = (err as { statusCode?: number })?.statusCode;
  if (statusCode !== 429) return null;
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 10_000;
}

// The free tier's per-minute quota is easy to exceed in a burst (many
// analyst calls fire close together). Gemini's 429 responses include a
// "retry in Ns" hint we can honor directly instead of guessing a backoff.
export async function withRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const delayMs = getRetryDelayMs(err);
      if (delayMs === null || attempt >= maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// Forces every analyst agent to answer through a single forced function call
// (tool_choice: allowed_tools mode "any") whose parameter schema is
// generated straight from the zod schema, then validates the call's
// arguments against that same zod schema before returning. This is the
// mechanism that keeps agent output machine-reliable structured JSON
// instead of free text the frontend has to parse.
export async function runStructuredAgent<T extends z.ZodTypeAny>(
  params: StructuredCallParams<T>
): Promise<z.infer<T>> {
  const { system, prompt, schema, toolName, toolDescription, maxTokens = 2000 } = params;

  const parameters = sanitizeSchemaForGemini(z.toJSONSchema(schema, { target: "draft-7" }));

  const interaction = await withRateLimitRetry(() =>
    ai.interactions.create({
      model: AI_MODEL,
      input: prompt,
      system_instruction: system,
      tools: [{ type: "function", name: toolName, description: toolDescription, parameters }],
      generation_config: {
        tool_choice: { allowed_tools: { mode: "any", tools: [toolName] } },
        max_output_tokens: maxTokens,
      },
      stream: false,
    })
  );

  const call = interaction.steps?.find(
    (step): step is Extract<typeof step, { type: "function_call" }> => step.type === "function_call"
  );
  if (!call) {
    throw new Error(`AI agent "${toolName}" did not return a structured tool call.`);
  }

  return schema.parse(call.arguments);
}
