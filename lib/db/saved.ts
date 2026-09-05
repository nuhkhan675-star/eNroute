import { createClient } from "@/lib/supabase/server";
import type { SavedStatus } from "@/lib/types/saved";

export type { SavedStatus } from "@/lib/types/saved";
export { SAVED_STATUS_LABELS } from "@/lib/types/saved";

export interface SavedUniversityRow {
  universityId: string;
  universityName: string;
  city: string | null;
  countryName: string;
  photoUrl: string | null;
  status: SavedStatus;
  savedAt: string;
}

// Which of the given universities the student has bookmarked -- one batched
// query so a grid of cards can each render their own bookmark state without
// an N+1 query per card.
export async function isUniversitySaved(profileId: string, universityId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_universities")
    .select("id")
    .eq("profile_id", profileId)
    .eq("university_id", universityId)
    .maybeSingle();
  return !!data;
}

export async function getSavedUniversityIds(profileId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_universities")
    .select("university_id")
    .eq("profile_id", profileId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.university_id));
}

export async function getSavedUniversities(profileId: string): Promise<SavedUniversityRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_universities")
    .select("university_id, status, created_at, universities(name, city, photo_url, countries(name))")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    universityId: row.university_id,
    universityName: row.universities?.name ?? "",
    city: row.universities?.city ?? null,
    countryName: row.universities?.countries?.name ?? "",
    photoUrl: row.universities?.photo_url ?? null,
    status: row.status,
    savedAt: row.created_at,
  }));
}

export async function saveUniversity(profileId: string, universityId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_universities")
    .upsert({ profile_id: profileId, university_id: universityId }, { onConflict: "profile_id,university_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function unsaveUniversity(profileId: string, universityId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_universities")
    .delete()
    .eq("profile_id", profileId)
    .eq("university_id", universityId);
  if (error) throw error;
}

export async function updateSavedStatus(profileId: string, universityId: string, status: SavedStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_universities")
    .update({ status })
    .eq("profile_id", profileId)
    .eq("university_id", universityId);
  if (error) throw error;
}
