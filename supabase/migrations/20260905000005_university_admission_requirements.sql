-- University-level admission requirements. The existing
-- admission_requirements table is keyed to university_program_id, which the
-- per-university pivot left unusable for bulk data: no bulk source publishes
-- per-program entry bars, and 0 rows were ever populated. This mirrors
-- university_admission_statistics -- keyed straight to the university, so it
-- needs no university_programs row to exist.
--
-- Stored as a 25th-75th percentile band rather than a single "minimum",
-- because that is what the source actually publishes: the middle 50% of
-- admitted students, not a cutoff. Presenting it as a hard minimum would
-- overstate what the data says.
create table public.university_admission_requirements (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  requirement_type text not null check (requirement_type in (
    'sat_total', 'sat_math', 'sat_reading', 'act_composite'
  )),
  min_value numeric,
  max_value numeric,
  description text not null,
  data_source_id uuid references public.data_sources(id),
  data_year int,
  last_verified_at date,
  created_at timestamptz not null default now(),
  unique (university_id, requirement_type)
);
create index on public.university_admission_requirements (university_id);

alter table public.university_admission_requirements enable row level security;
create policy "public read university admission requirements"
  on public.university_admission_requirements for select using (true);
