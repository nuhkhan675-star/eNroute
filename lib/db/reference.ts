import { createClient } from "@/lib/supabase/server";

export interface Curriculum {
  id: string;
  code: string;
  name: string;
}

export interface Subject {
  id: string;
  curriculum_id: string;
  name: string;
  available_levels: string[];
  grade_scale: string;
}

export interface ProgramCategory {
  id: string;
  code: string;
  name: string;
  parent_group: string;
}

export interface Country {
  id: string;
  iso_code: string;
  name: string;
}

export async function getCurricula(): Promise<Curriculum[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("curricula")
    .select("id, code, name")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getSubjectsForCurriculum(curriculumId: string): Promise<Subject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id, curriculum_id, name, available_levels, grade_scale")
    .eq("curriculum_id", curriculumId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProgramCategories(): Promise<ProgramCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("program_categories")
    .select("id, code, name, parent_group")
    .order("parent_group")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

// The university database is currently scoped to these 6 countries only --
// offering the full ~195-country list here would let students pick
// countries that can never match a real program.
const SUPPORTED_COUNTRY_CODES = ["IN", "US", "SG", "HK", "GB", "AU"];

export async function getCountries(): Promise<Country[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("countries")
    .select("id, iso_code, name")
    .in("iso_code", SUPPORTED_COUNTRY_CODES)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getCountryById(id: string): Promise<Country | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("countries")
    .select("id, iso_code, name")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
