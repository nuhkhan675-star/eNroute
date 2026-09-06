import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { ensureGeneralAnalyses } from "@/lib/ai/orchestrator";
import { analyzeUniversity } from "@/lib/ai/analyzeUniversity";
import { getUniversityAnalysis } from "@/lib/db/analyses";
import { friendlyAnalysisError } from "@/lib/ai/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ universityId: string }> }
) {
  const { universityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await getProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No profile found. Complete onboarding first." }, { status: 404 });

  // Cache check BEFORE any AI call. This route previously went straight to
  // analyzeUniversity and only upserted afterwards, so searching the same
  // university five times cost five full analyses and overwrote the row each
  // time. The stored result is per (profile, university), so a repeat search --
  // today, tomorrow, or after navigating away -- returns instantly and free.
  //
  // ?refresh=1 forces a re-run, for when a profile has changed and the cached
  // result is stale.
  const forceRefresh = _request.nextUrl.searchParams.get("refresh") === "1";
  if (!forceRefresh) {
    const cached = await getUniversityAnalysis(profile.id, universityId);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const { academic, extracurricular } = await ensureGeneralAnalyses(profile);
    const result = await analyzeUniversity({
      profile,
      academic,
      extracurricular,
      universityId,
    });
    if (!result) {
      return NextResponse.json({ error: "University not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("University analysis failed", err);
    const { message, status } = friendlyAnalysisError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
