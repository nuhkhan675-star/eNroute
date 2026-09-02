import { createClient } from "@/lib/supabase/server";

export async function getUserFullName(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name ?? null;
}
