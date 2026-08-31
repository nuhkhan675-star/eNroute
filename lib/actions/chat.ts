"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { createConversation } from "@/lib/db/chat";
import { proposeProfileUpdateSchema, type ProposeProfileUpdate } from "@/lib/ai/schemas";
import { redirect } from "next/navigation";

export async function startNewConversation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(user.id);
  if (!profile) redirect("/onboarding");

  const conversation = await createConversation(profile.id);
  redirect(`/chat/${conversation.id}`);
}

export interface ConfirmUpdateResult {
  error?: string;
  applied?: boolean;
}

// Applies a propose_profile_update the student confirmed in the chat UI.
// The AI never writes to the profile directly -- this is the only path a
// chat-originated change can take, and it always goes through a confirm
// click. Wipes cached analyses so the next Analyze run reflects the change
// instead of silently going stale.
export async function confirmProfileUpdate(raw: unknown): Promise<ConfirmUpdateResult> {
  const parsed = proposeProfileUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid update payload." };
  const update: ProposeProfileUpdate = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const profile = await getProfileByUserId(user.id);
  if (!profile) return { error: "No profile found." };

  if (update.kind === "extracurricular" && update.extracurricular) {
    const { error } = await supabase.from("extracurriculars").insert({
      profile_id: profile.id,
      activity_name: update.extracurricular.activityName,
      category: update.extracurricular.category,
      role: update.extracurricular.role ?? null,
      years_involved: update.extracurricular.yearsInvolved ?? null,
      description: update.extracurricular.description ?? null,
      achievements: update.extracurricular.achievements ?? null,
      impact: update.extracurricular.impact ?? null,
    });
    if (error) return { error: error.message };
  } else {
    return { error: "This type of update isn't supported yet." };
  }

  // Invalidate cached analyses so the next "Analyze" run picks up the change
  // instead of the dashboard/chat silently going stale.
  await supabase.from("ai_analyses").delete().eq("profile_id", profile.id);

  return { applied: true };
}
