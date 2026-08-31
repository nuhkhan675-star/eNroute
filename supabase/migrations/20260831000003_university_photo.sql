-- Wikipedia-sourced lead image for a university, shown alongside analysis
-- results. Nullable -- most bulk-imported universities won't have one until
-- enriched; the UI falls back to a generic placeholder when absent.
alter table public.universities add column photo_url text;
alter table public.universities add column photo_attribution text;
