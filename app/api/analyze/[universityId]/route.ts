import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { ensureGeneralAnalyses } from "@/lib/ai/orchestrator";
import { analyzeUniversity } from "@/lib/ai/analyzeUniversity";
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
