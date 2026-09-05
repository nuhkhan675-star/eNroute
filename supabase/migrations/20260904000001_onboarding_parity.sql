-- 1. Target countries (multi-select, join table matching the existing
-- grade_10_subjects ownership-RLS pattern).
create table public.student_target_countries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, country_id)
);
create index on public.student_target_countries (profile_id);
alter table public.student_target_countries enable row level security;
create policy "own target countries" on public.student_target_countries
  for all using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));

-- 3. Full IB structure: subject grouping + CAS.
alter table public.subjects add column subject_group text;
alter table public.student_profiles add column cas_completed boolean;

-- 4. Grade 9 and 11 (Grade 10 already exists as grade_10_subjects) --
-- identical shape/RLS, kept as separate sibling tables rather than
-- generalizing grade_10_subjects, which is already wired through
-- submitOnboarding/StepReview/academicAnalyst.
create table public.grade_9_subjects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  subject_name text not null,
  grade text not null,
  created_at timestamptz not null default now()
);
create index on public.grade_9_subjects (profile_id);
alter table public.grade_9_subjects enable row level security;
create policy "own grade 9 subjects" on public.grade_9_subjects
  for all using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));

create table public.grade_11_subjects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  subject_name text not null,
  grade text not null,
  created_at timestamptz not null default now()
);
create index on public.grade_11_subjects (profile_id);
alter table public.grade_11_subjects enable row level security;
create policy "own grade 11 subjects" on public.grade_11_subjects
  for all using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));

-- 6. Lifestyle/fit preferences -- stored and displayed; only
-- preferred_ranking_band is wired into actual filtering for now (see plan).
alter table public.student_profiles
  add column preferred_climate text check (preferred_climate in ('no_preference', 'warm', 'balanced', 'cold')),
  add column preferred_industry_hub text check (preferred_industry_hub in (
    'no_preference', 'tech', 'finance', 'business', 'creative', 'research',
    'healthcare', 'government_policy', 'manufacturing_engineering'
  )),
  add column preferred_ranking_band text check (preferred_ranking_band in ('no_preference', 'top_50', 'top_100', 'top_200'));

-- 7. Saved profile version history.
create table public.student_profile_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index on public.student_profile_versions (profile_id, created_at desc);
alter table public.student_profile_versions enable row level security;
create policy "own profile versions" on public.student_profile_versions
  for all using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));
