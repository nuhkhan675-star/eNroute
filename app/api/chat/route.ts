import { NextResponse, type NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getConversation, saveMessage, getMessages } from "@/lib/db/chat";
import { buildChatContext } from "@/lib/ai/chat/buildContext";
import { proposeProfileUpdateSchema } from "@/lib/ai/schemas";
import { AI_MODEL, withRateLimitRetry } from "@/lib/ai/client";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROPOSE_UPDATE_TOOL_NAME = "propose_profile_update";
const PROPOSE_UPDATE_TOOL_DESCRIPTION =
  "Call this only if the student's latest message states new information about themselves (a new achievement, award, activity, or grade) that should be added to their stored profile. Do not call it otherwise.";

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

function sseEvent(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const { conversationId, message, focusedUniversityId } = await request.json();
  if (!conversationId || !message) {
    return NextResponse.json({ error: "conversationId and message are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await getProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No profile found" }, { status: 404 });

  const conversation = await getConversation(conversationId);
  if (!conversation || conversation.profileId !== profile.id) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await saveMessage(conversationId, "user", message);

  const [systemPrompt, history] = await Promise.all([
    buildChatContext(profile, focusedUniversityId ?? null),
    getMessages(conversationId),
  ]);

  // Gemini interactions take a single input string/turn list rather than
  // role-tagged messages; fold history into the prompt.
  const transcript = history
    .slice(-20)
    .map((m) => `${m.role === "assistant" ? "Advisor" : "Student"}: ${m.content}`)
    .join("\n\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      try {
        const textStream = await withRateLimitRetry(() =>
          ai.interactions.create({
            model: AI_MODEL,
            input: transcript,
            system_instruction: systemPrompt,
            stream: true,
          })
        );

        for await (const event of textStream) {
          if (event.event_type === "step.delta" && event.delta?.type === "text") {
            fullText += event.delta.text;
            controller.enqueue(encoder.encode(sseEvent({ type: "text", value: event.delta.text })));
          }
        }

        if (fullText.trim().length > 0) {
          await saveMessage(conversationId, "assistant", fullText);
        }

        // Separate, non-streamed, optional (tool_choice "auto") call: only
        // proposes a profile update when the model actually decides to call
        // the tool. The AI never writes to the profile directly -- this is
        // purely a proposal the student confirms client-side.
        const updateCheck = await withRateLimitRetry(() =>
          ai.interactions.create({
            model: AI_MODEL,
            input: `Student's latest message: "${message}"\n\nAdvisor's reply: "${fullText}"`,
            system_instruction:
              "You are reviewing one chat exchange from a university admissions advisor conversation to decide whether the student stated new profile information.",
            tools: [
              {
                type: "function",
                name: PROPOSE_UPDATE_TOOL_NAME,
                description: PROPOSE_UPDATE_TOOL_DESCRIPTION,
                parameters: sanitizeSchemaForGemini(
                  z.toJSONSchema(proposeProfileUpdateSchema, { target: "draft-7" })
                ),
              },
            ],
            generation_config: { tool_choice: { allowed_tools: { mode: "auto", tools: [PROPOSE_UPDATE_TOOL_NAME] } } },
            stream: false,
          })
        );

        const call = updateCheck.steps?.find(
          (step): step is Extract<typeof step, { type: "function_call" }> => step.type === "function_call"
        );
        if (call) {
          const parsed = proposeProfileUpdateSchema.safeParse(call.arguments);
          if (parsed.success) {
            controller.enqueue(encoder.encode(sseEvent({ type: "propose_update", value: parsed.data })));
          }
        }

        controller.enqueue(encoder.encode(sseEvent({ type: "done" })));
      } catch (err) {
        console.error("Chat stream failed", err);
        controller.enqueue(
          encoder.encode(sseEvent({ type: "error", value: err instanceof Error ? err.message : "Chat failed" }))
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
