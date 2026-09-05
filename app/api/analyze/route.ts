import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { analyzeProfile } from "@/lib/ai/orchestrator";
import { friendlyAnalysisError } from "@/lib/ai/client";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await getProfileByUserId(user.id);
  if (!profile) return NextResponse.json({ error: "No profile found. Complete onboarding first." }, { status: 404 });

  try {
    const result = await analyzeProfile(profile.id);
    return NextResponse.json({
      profileStrength: result.profileStrength,
    });
  } catch (err) {
    console.error("Profile analysis failed", err);
    const { message, status } = friendlyAnalysisError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
