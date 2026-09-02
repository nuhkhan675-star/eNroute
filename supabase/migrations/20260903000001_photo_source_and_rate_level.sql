-- Structured photo provenance so the image source is no longer just a
-- human-readable attribution string, and can be swapped to a different
-- source type later without a schema change.
alter table public.universities
  add column photo_source_type text,
  add column photo_source_url text,
  add column photo_last_verified_at date;

comment on column public.universities.photo_source_type is
  'e.g. official_website, wikimedia_commons, press_kit -- how photo_url was sourced';
comment on column public.universities.photo_source_url is
  'The page the photo was sourced from (not the raw image CDN url)';

-- Every admission_statistics row today is implicitly program-level (it's
-- always tied to a university_program_id), but the platform spec requires
-- distinguishing university-wide vs faculty vs program-specific rates so a
-- broad rate is never mistaken for a program-specific one. Default existing
-- and future rows to 'program' (their actual current meaning); a future
-- university-wide-only stat can be recorded with level='university'.
alter table public.admission_statistics
  add column level text not null default 'program' check (level in ('university', 'faculty', 'program'));
