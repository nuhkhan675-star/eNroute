import "server-only";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { z } from "zod";

// Server-only. Importing this from a client component is a build error
// (via the "server-only" package) so the API keys can never leak to the
// browser bundle.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// gemini-2.5-flash is deprecated for new API keys (Google's own 404 error
// points here); gemini-3.7-flash's free quota proved far stricter than
// documented (20 total requests hit instantly). 3.6-flash is what Google's
// API itself recommends as the replacement for 2.5-flash.
export const GEMINI_MODEL = "gemini-3.6-flash";

/**
 * Which provider serves the PRIMARY call. Set AI_PROVIDER=openai in
 * .env.local to run on OpenAI instead of Gemini. Anything else (or unset)
 * keeps Gemini.
 */
export const AI_PROVIDER = process.env.AI_PROVIDER === "openai" ? "openai" : "gemini";

/**
 * The exact OpenAI model id. Pinned to one value on purpose -- never an
 * alias like "latest", so an upstream default can't silently move you onto a
 * pricier model. Override with OPENAI_MODEL in .env.local; verify the exact
 * id against OpenAI's model list, since the API id and the marketing name
 * ("GPT-5.6 Luna") are not always the same string.
 */
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";

/** The model actually serving primary calls -- what gets logged and recorded. */
export const AI_MODEL = AI_PROVIDER === "openai" ? OPENAI_MODEL : GEMINI_MODEL;

/**
 * The model used when the primary provider hits a quota wall. Only reachable
 * when Gemini is primary -- if AI_PROVIDER is already "openai" there is
 * nothing to fall back to.
 *
 * Unlike the Claude fallback this replaces, cost is not the concern here:
 * Luna is cheap enough that this being a paid path barely matters. What
 * matters is that Gemini's free tier exhausts under real load (observed
 * mid-session, with every request failing until the daily quota reset), and
 * a hard stop is worse than quietly continuing on a paid provider.
 */
export const FALLBACK_AI_MODEL = OPENAI_MODEL;

/** Whether a fallback is actually available for the current configuration. */
const fallbackAvailable = () => AI_PROVIDER === "gemini" && openai !== null;

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
  const statusCode = (err as { statusCode?: number; status?: number })?.statusCode ??
    (err as { status?: number })?.status;
  if (statusCode !== 429) return null;
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 10_000;
}

/**
 * Total time we're willing to spend waiting out 429s before giving up.
 * Without a ceiling, honoring the provider's own "retry in 50s" hints four
 * times over meant a genuinely exhausted quota took ~4 minutes to surface as
 * an error -- the user just watched a spinner. Failing inside a minute is
 * far more useful than retrying into a wall.
 */
const MAX_TOTAL_RETRY_WAIT_MS = 60_000;

// A burst of analyst calls can exceed a per-minute quota. 429 responses
// include a "retry in Ns" hint we honor directly instead of guessing a
// backoff -- but only while the cumulative wait stays under the ceiling.
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 4,
  /**
   * When a fallback provider is standing by there is no point sitting out
   * Gemini's "retry in 50s" hints -- that was what made the previous
   * fallback feel broken: an exhausted quota took minutes to surface while
   * the user watched a spinner. Surface the 429 immediately instead and let
   * the caller switch providers.
   */
  failFastOn429 = false
): Promise<T> {
  let waitedMs = 0;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const delayMs = getRetryDelayMs(err);
      if (delayMs === null || attempt >= maxRetries) throw err;
      if (failFastOn429) throw err;
      // Retrying would push us past the budget -- surface the 429 now.
      if (waitedMs + delayMs > MAX_TOTAL_RETRY_WAIT_MS) throw err;
      waitedMs += delayMs;
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

  const interaction = await withRateLimitRetry(
    () =>
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
      }),
    4,
    fallbackAvailable()
  );

  const call = interaction.steps?.find(
    (step): step is Extract<typeof step, { type: "function_call" }> => step.type === "function_call"
  );
  if (!call) {
    throw new Error(`AI agent "${toolName}" did not return a structured tool call.`);
  }

  return schema.parse(call.arguments);
}

// Same forced-tool-call contract as runGeminiStructured, on OpenAI. Selected
// by AI_PROVIDER=openai; the model id is pinned by OPENAI_MODEL so there is
// exactly one place that decides which model runs.
async function runOpenAIStructured<T extends z.ZodTypeAny>(params: StructuredCallParams<T>): Promise<z.infer<T>> {
  const { system, prompt, schema, toolName, toolDescription, maxTokens = 2000 } = params;
  if (!openai) throw new Error("OPENAI_API_KEY is not set.");

  const completion = await withRateLimitRetry(() =>
    openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: toolName,
            description: toolDescription,
            parameters: z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>,
          },
        },
      ],
      // Force the call rather than letting the model choose to answer in
      // prose -- the whole pipeline depends on structured output.
      tool_choice: { type: "function", function: { name: toolName } },
      // gpt-5.6-luna rejects function tools on /v1/chat/completions unless
      // reasoning is off ("Function tools with reasoning_effort are not
      // supported ... set reasoning_effort to 'none'"). We don't want
      // reasoning tokens here anyway: the analyst returns a fixed schema,
      // and reasoning tokens bill at the output rate.
      reasoning_effort: "none",
      max_completion_tokens: maxTokens,
    })
  );

  // Log what the API says it actually ran, not what we asked for -- the only
  // reliable way to confirm you're on the model you think you are, and it
  // surfaces token usage for cost checking.
  const u = completion.usage;
  console.log(
    `[ai] provider=openai model=${completion.model} tool=${toolName}` +
      (u ? ` in=${u.prompt_tokens} out=${u.completion_tokens}` : "")
  );

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.type !== "function") {
    throw new Error(`AI agent "${toolName}" did not return a structured tool call.`);
  }
  return schema.parse(JSON.parse(call.function.arguments));
}

// Forces every analyst agent to answer through a single forced tool call
// whose parameter schema is generated straight from the zod schema, then
// validates the call's arguments against that same zod schema before
// returning. This is the mechanism that keeps agent output machine-reliable
// structured JSON instead of free text the frontend has to parse.
//
// Which provider actually serves the call is decided once, by AI_PROVIDER,
// rather than by a runtime fallback. An earlier version made Gemini primary
// and retried against a second provider on a surviving 429; that was removed
// deliberately, because honouring the provider's own "retry in Ns" hints
// before failing over meant an exhausted quota took minutes to surface as an
// error while the user watched a spinner. Switching provider is now an
// explicit config change, so a quota wall is visible rather than absorbed.
export async function runStructuredAgent<T extends z.ZodTypeAny>(
  params: StructuredCallParams<T>
): Promise<z.infer<T>> {
  if (AI_PROVIDER === "openai") return runOpenAIStructured(params);

  try {
    return await runGeminiStructured(params);
  } catch (err) {
    const statusCode =
      (err as { statusCode?: number; status?: number })?.statusCode ??
      (err as { status?: number })?.status;
    if (statusCode === 429 && fallbackAvailable()) {
      console.warn(
        `Gemini quota exhausted -- falling back to GPT-5.6 Luna for "${params.toolName}"`
      );
      return runOpenAIStructured(params);
    }
    throw err;
  }
}
