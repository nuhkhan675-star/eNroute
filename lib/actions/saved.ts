"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { saveUniversity, unsaveUniversity, updateSavedStatus, type SavedStatus } from "@/lib/db/saved";

async function requireProfileId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await getProfileByUserId(user.id);
  return profile?.id ?? null;
}

export async function toggleSavedUniversity(universityId: string, currentlySaved: boolean): Promise<{ error?: string }> {
  const profileId = await requireProfileId();
  if (!profileId) return { error: "You need a profile to save universities." };
  if (currentlySaved) {
    await unsaveUniversity(profileId, universityId);
  } else {
    await saveUniversity(profileId, universityId);
  }
  revalidatePath("/saved");
  revalidatePath("/dashboard");
  return {};
}

export async function setSavedUniversityStatus(universityId: string, status: SavedStatus): Promise<{ error?: string }> {
  const profileId = await requireProfileId();
  if (!profileId) return { error: "You need a profile to track application status." };
  await updateSavedStatus(profileId, universityId, status);
  revalidatePath("/saved");
  return {};
}
