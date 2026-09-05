import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { ensureGeneralAnalyses } from "@/lib/ai/orchestrator";
import { analyzeUniversities } from "@/lib/ai/analyzeUniversity";
import { friendlyAnalysisError } from "@/lib/ai/client";

// Analyzes several universities in one request -- the dashboard's
// auto-analysis queue calls this with a chunk of pending university_ids
// instead of hitting /api/analyze/[id] once per university. Internally this
// still splits into Gemini-sized batches (see PROGRAM_ANALYSIS_BATCH_SIZE),
// so the caller doesn't need to know the batch size -- it can pass any
// reasonable chunk and this route re-batches it correctly.
const MAX_PER_REQUEST = 25;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const universityIds: unknown = body?.universityIds;
  if (!Array.isArray(universityIds) || universityIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "universityIds must be an array of strings" }, { status: 400 });
  }
  if (universityIds.length === 0) {
    return NextResponse.json({ results: [] });
  }
  if (universityIds.length > MAX_PER_REQUEST) {
    return NextResponse.json({ error: `At most ${MAX_PER_REQUEST} universities per request` }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await getProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No profile found. Complete onboarding first." }, { status: 404 });

  try {
    const { academic, extracurricular } = await ensureGeneralAnalyses(profile);
    const results = await analyzeUniversities({
      profile,
      academic,
      extracurricular,
      universityIds: universityIds as string[],
    });
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Batch university analysis failed", err);
    const { message, status } = friendlyAnalysisError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
