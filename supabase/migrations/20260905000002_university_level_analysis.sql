-- Pivot from per-program to per-university admission-chance analysis.
-- College Scorecard (and every other bulk source) only ever gives
-- university-wide facts, never per-program ones, so the prediction
-- pipeline moves to being keyed by university_id, with university_program_id
-- kept only as an optional descriptive reference.

-- 1. New table: real acceptance-rate data keyed by university, not program.
-- Same shape as admission_statistics minus the program linkage -- this is
-- what the College Scorecard pipeline (and the on-demand lookup flow) write
-- to directly, with no program-attachment step required.
create table public.university_admission_statistics (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  year int not null,
  acceptance_rate numeric,
  applicant_count int,
  admitted_count int,
  confidence text not null default 'high' check (confidence in ('high', 'moderate', 'low')),
  data_source_id uuid references public.data_sources(id),
  last_verified_at date,
  created_at timestamptz not null default now(),
  unique (university_id, year)
);
create index on public.university_admission_statistics (university_id);

-- Readable by anyone (same public-read posture as universities/programs);
-- writes go through the service-role client only (ingestion scripts, admin
-- tooling), matching the existing admission_statistics table's posture.
alter table public.university_admission_statistics enable row level security;
create policy "public read university admission statistics" on public.university_admission_statistics
  for select using (true);

-- Backfill: the 22 admission_statistics rows entered this session were
-- already university-wide facts (level='university') just attached to
-- whichever program happened to exist -- copy them onto their real parent
-- university, one row per university (they're duplicated across a
-- university's programs today, hence distinct on).
insert into public.university_admission_statistics (university_id, year, acceptance_rate, applicant_count, admitted_count, confidence, data_source_id, last_verified_at)
select distinct on (up.university_id)
  up.university_id, s.year, s.acceptance_rate, s.applicant_count, s.admitted_count, s.confidence, s.data_source_id, s.last_verified_at
from public.admission_statistics s
join public.university_programs up on up.id = s.university_program_id
order by up.university_id, s.year desc
on conflict (university_id, year) do nothing;

-- 2. Re-key university_analysis from (profile_id, university_program_id) to
-- (profile_id, university_id).
alter table public.university_analysis add column university_id uuid references public.universities(id) on delete cascade;

update public.university_analysis ua
set university_id = up.university_id
from public.university_programs up
where up.id = ua.university_program_id;

-- Dedupe: a profile could have had 2 different programs analyzed at the
-- same university under the old model. Keep the most recently updated row
-- per (profile_id, university_id) before the new unique constraint is added.
delete from public.university_analysis ua
using public.university_analysis newer
where ua.profile_id = newer.profile_id
  and ua.university_id = newer.university_id
  and ua.id <> newer.id
  and (ua.updated_at, ua.id) < (newer.updated_at, newer.id);

alter table public.university_analysis alter column university_id set not null;
alter table public.university_analysis alter column university_program_id drop not null;

-- Drop whatever the old (profile_id, university_program_id) unique
-- constraint is actually named (looked up dynamically rather than assumed,
-- since Postgres's auto-generated name isn't guaranteed) and replace it.
do $$
declare
  old_constraint text;
  target_cols smallint[];
begin
  select array_agg(attnum order by attnum) into target_cols
  from pg_attribute
  where attrelid = 'public.university_analysis'::regclass
    and attname in ('profile_id', 'university_program_id');

  select conname into old_constraint
  from pg_constraint
  where conrelid = 'public.university_analysis'::regclass
    and contype = 'u'
    and (select array_agg(k order by k) from unnest(conkey) k) = target_cols;

  if old_constraint is not null then
    execute format('alter table public.university_analysis drop constraint %I', old_constraint);
  end if;
end $$;

alter table public.university_analysis add constraint university_analysis_profile_id_university_id_key unique (profile_id, university_id);

create index on public.university_analysis (university_id);
