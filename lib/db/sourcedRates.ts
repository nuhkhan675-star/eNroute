import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SourcedRate } from "@/lib/ai/sourcedAcceptanceRate";

/**
 * Persists a web-sourced acceptance rate through the SAME provenance path as
 * every other real figure: a data_sources row carrying the URL, and a
 * university_admission_statistics row pointing at it. Once stored it is
 * indistinguishable from the College Scorecard data -- because it is the same
 * kind of thing, a published number with a citable source and a date.
 *
 * Stored per university, not per student, so a lookup is paid for once ever
 * and every subsequent student benefits from it for free.
 */
export async function saveSourcedAcceptanceRate(universityId: string, sourced: SourcedRate): Promise<void> {
  const supabase = await createClient();

  const { data: existingSource } = await supabase
    .from("data_sources").select("id").eq("url", sourced.sourceUrl).maybeSingle();

  let dataSourceId = existingSource?.id ?? null;
  if (!dataSourceId) {
    const { data: inserted, error } = await supabase
      .from("data_sources")
      .insert({
        name: sourced.sourceTitle.slice(0, 200),
        url: sourced.sourceUrl,
        source_type: "web",
        // Below an official bulk dataset like IPEDS, above anything derived:
        // a real published page, located and verified per university.
        reliability_tier: "secondary",
      })
      .select("id").single();
    if (error) throw error;
    dataSourceId = inserted.id;
  }

  const { error: statError } = await supabase
    .from("university_admission_statistics")
    .upsert(
      {
        university_id: universityId,
        year: sourced.year,
        acceptance_rate: sourced.acceptanceRate,
        applicant_count: sourced.applicants,
        admitted_count: sourced.admitted,
        confidence: "moderate",
        data_source_id: dataSourceId,
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: "university_id,year" }
    );
  if (statError) throw statError;
}
