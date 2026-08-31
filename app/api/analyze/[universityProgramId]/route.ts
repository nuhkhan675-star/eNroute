import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { ensureGeneralAnalyses } from "@/lib/ai/orchestrator";
import { analyzeUniversityProgram } from "@/lib/ai/analyzeProgram";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ universityProgramId: string }> }
) {
  const { universityProgramId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await getProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No profile found. Complete onboarding first." }, { status: 404 });

  try {
    const { academic, extracurricular, majorFit } = await ensureGeneralAnalyses(profile);
    const result = await analyzeUniversityProgram({
      profile,
      academic,
      extracurricular,
      majorFit,
      universityProgramId,
    });
    if (!result) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("Program analysis failed", err);
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
