-- Stable external key for US universities sourced from the College
-- Scorecard API (IPEDS unit id) so the ingestion script in
-- scripts/import-college-scorecard.mjs can safely upsert on re-run instead
-- of matching fragile, punctuation-sensitive institution names. Null for
-- every university not sourced from Scorecard (all non-US universities,
-- and any US university entered by hand before this pipeline existed).
alter table public.universities add column ipeds_unit_id integer unique;
