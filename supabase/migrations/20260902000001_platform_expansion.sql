-- Platform expansion: multi-source rankings, deeper program catalog, budget removal.

-- Rankings: a single int column can't represent "national vs global vs
-- subject" or identify a source/year, which the product now requires to
-- never show an unexplained number. No real ranking data was ever
-- successfully backfilled (0 non-null rows), so this is a clean cut.
alter table public.universities drop column ranking;

create table public.university_rankings (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  ranking_type text not null check (ranking_type in ('national', 'global', 'subject')),
  ranking_value int not null,
  ranking_org text not null,
  ranking_year int not null,
  subject_category_id uuid references public.program_categories(id) on delete set null,
  source_url text,
  last_verified_at date,
  created_at timestamptz not null default now()
);
create index on public.university_rankings (university_id);

alter table public.university_rankings enable row level security;
create policy "public read" on public.university_rankings for select using (true);

-- Program catalog depth: subject/grade/test/language/document requirements
-- already live in admission_requirements; these are the remaining fields
-- the spec asks for that don't have a home yet.
alter table public.university_programs
  add column faculty text,
  add column campus text,
  add column official_url text;

-- Budget/affordability is explicitly out of scope for this product.
alter table public.student_profiles
  drop column budget_amount,
  drop column budget_currency,
  drop column budget_includes_living;
