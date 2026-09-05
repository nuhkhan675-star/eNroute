-- Short-form search: students type "NUS", "NTU", "MIT", "BITS", "HKU" far
-- more often than the full legal name, and an ilike on `name` can never match
-- those because the letters aren't contiguous in the string.
--
-- Stored rather than computed per query: PostgREST can't express "initials of
-- each significant word" as a filter, and a generated column would have to
-- re-derive it on every row scan. Backfilled and kept current by
-- scripts/backfill-university-acronyms.mjs.
alter table public.universities add column if not exists acronym text;

-- Prefix lookups ("bits" -> "bitsp") are the common case, so index for the
-- lower-cased prefix pattern the search actually issues.
create index if not exists universities_acronym_idx
  on public.universities (lower(acronym) text_pattern_ops);
