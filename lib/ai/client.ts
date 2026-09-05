import "server-only";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Server-only. Importing this from a client component is a build error
// (via the "server-only" package) so the API keys can never leak to the
// browser bundle.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// gemini-2.5-flash is deprecated for new API keys (Google's own 404 error
// points here); gemini-3.7-flash's free quota proved far stricter than
// documented (20 total requests hit instantly). 3.6-flash is what Google's
// API itself recommends as the replacement for 2.5-flash.
export const AI_MODEL = "gemini-3.6-flash";

// Used only when Gemini's quota is genuinely exhausted (a 429 that survives
// every retry in withRateLimitRetry) and ANTHROPIC_API_KEY is configured --
// see runStructuredAgent. Never the primary path, so a slower/pricier model
// here doesn't affect normal-case cost.
export const FALLBACK_AI_MODEL = "claude-sonnet-5";

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

// Route handlers call this to turn a caught analysis error into a clean,
// user-facing message instead of leaking the raw Gemini SDK error text
// (multi-line, mentions internal quota metrics/model names) straight into
// the UI. A 429 that survives every retry in withRateLimitRetry means the
// free-tier quota is genuinely exhausted for this window, not a bug.
export function friendlyAnalysisError(err: unknown): { message: string; status: number } {
  const statusCode = (err as { statusCode?: number })?.statusCode;
  if (statusCode === 429) {
    return {
      message: "We're getting a lot of requests right now. Please wait a minute and try again.",
      status: 429,
    };
  }
  return {
    message: err instanceof Error ? err.message : "Analysis failed",
    status: 500,
  };
}

async function runGeminiStructured<T extends z.ZodTypeAny>(params: StructuredCallParams<T>): Promise<z.infer<T>> {
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

// Same forced-tool-call contract as runGeminiStructured, via Claude's tool
// use instead -- only ever invoked as a fallback (see runStructuredAgent),
// so it mirrors the exact same schema/system/prompt shape rather than
// needing its own agent-specific code.
async function runAnthropicStructured<T extends z.ZodTypeAny>(params: StructuredCallParams<T>): Promise<z.infer<T>> {
  const { system, prompt, schema, toolName, toolDescription, maxTokens = 2000 } = params;
  if (!anthropic) {
    throw new Error("Claude fallback is not configured (missing ANTHROPIC_API_KEY).");
  }

  const message = await anthropic.messages.create({
    model: FALLBACK_AI_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
    tools: [
      {
        name: toolName,
        description: toolDescription,
        input_schema: z.toJSONSchema(schema, { target: "draft-7" }) as Anthropic.Tool["input_schema"],
      },
    ],
    tool_choice: { type: "tool", name: toolName },
  });

  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === toolName
  );
  if (!block) {
    throw new Error(`Claude fallback agent "${toolName}" did not return a structured tool call.`);
  }

  return schema.parse(block.input);
}

// Forces every analyst agent to answer through a single forced tool call
// whose parameter schema is generated straight from the zod schema, then
// validates the call's arguments against that same zod schema before
// returning. This is the mechanism that keeps agent output machine-reliable
// structured JSON instead of free text the frontend has to parse.
//
// Gemini is the primary model (see AI_MODEL). If its quota is genuinely
// exhausted -- a 429 that survives every retry in withRateLimitRetry, not a
// transient blip -- and ANTHROPIC_API_KEY is configured, the exact same
// call is retried once against Claude so a quota wall on one provider
// doesn't stall the whole app.
export async function runStructuredAgent<T extends z.ZodTypeAny>(
  params: StructuredCallParams<T>
): Promise<z.infer<T>> {
  try {
    return await runGeminiStructured(params);
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 429 && anthropic) {
      console.warn(`Gemini quota exhausted -- falling back to Claude for "${params.toolName}"`);
      return runAnthropicStructured(params);
    }
    throw err;
  }
}
