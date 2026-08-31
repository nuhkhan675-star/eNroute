-- University-side data. Public read, service-role write (admin path).
-- Every fact table carries data_source_id + data_year + last_verified_at so
-- the frontend can distinguish FACT (sourced) from AI INFERENCE, and so
-- unverifiable fields can stay null instead of being guessed.

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_id uuid not null references public.countries(id) on delete restrict,
  city text,
  website text,
  university_type text check (university_type in ('public','private','other')),
  description text,
  data_source_id uuid references public.data_sources(id) on delete set null,
  data_year int,
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.universities (country_id);
create index universities_name_trgm_idx on public.universities using gin (name gin_trgm_ops);

create table public.university_programs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  display_name text not null,          -- as actually offered, e.g. 'BSc Finance'
  degree_level text not null check (degree_level in ('bachelor','master','phd','diploma','foundation')),
  duration_years numeric(3,1),
  delivery_mode text check (delivery_mode in ('on_campus','online','hybrid')),
  overview text,
  data_source_id uuid references public.data_sources(id) on delete set null,
  data_year int,
  last_verified_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.university_programs (university_id);
create index on public.university_programs (program_id);

-- This is the factual filter join: country = X AND program_category = Y is
-- university_programs join universities join programs, in SQL -- never AI.

create table public.admission_requirements (
  id uuid primary key default gen_random_uuid(),
  university_program_id uuid not null references public.university_programs(id) on delete cascade,
  requirement_type text not null check (requirement_type in ('subject','grade','test','language','document','other')),
  subject_id uuid references public.subjects(id) on delete set null,
  min_grade text,
  description text not null,
  data_source_id uuid references public.data_sources(id) on delete set null,
  data_year int,
  last_verified_at date,
  created_at timestamptz not null default now()
);
create index on public.admission_requirements (university_program_id);

create table public.admission_statistics (
  id uuid primary key default gen_random_uuid(),
  university_program_id uuid not null references public.university_programs(id) on delete cascade,
  year int not null,
  acceptance_rate numeric(5,2),
  applicant_count int,
  admitted_count int,
  avg_academic_metric text,
  international_acceptance_rate numeric(5,2),
  confidence text not null check (confidence in ('high','moderate','low')),
  data_source_id uuid references public.data_sources(id) on delete set null,
  last_verified_at date,
  created_at timestamptz not null default now(),
  unique (university_program_id, year)
);

create table public.tuition (
  id uuid primary key default gen_random_uuid(),
  university_program_id uuid not null references public.university_programs(id) on delete cascade,
  year int not null,
  currency text not null,
  domestic_amount numeric(12,2),
  international_amount numeric(12,2),
  data_source_id uuid references public.data_sources(id) on delete set null,
  last_verified_at date,
  created_at timestamptz not null default now(),
  unique (university_program_id, year)
);

create table public.scholarships (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  university_program_id uuid references public.university_programs(id) on delete cascade,
  name text not null,
  amount_type text not null check (amount_type in ('fixed','percentage','full_ride','variable')),
  amount numeric(12,2),
  currency text,
  eligibility_text text,
  eligibility_structured jsonb,
  deadline date,
  data_source_id uuid references public.data_sources(id) on delete set null,
  last_verified_at date,
  created_at timestamptz not null default now()
);
create index on public.scholarships (university_id);
create index on public.scholarships (university_program_id);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  university_program_id uuid not null references public.university_programs(id) on delete cascade,
  deadline_type text not null check (deadline_type in ('early_decision','early_action','regular','rolling','other')),
  applicant_type text check (applicant_type in ('international','domestic','all')),
  date date,
  notes text,
  data_source_id uuid references public.data_sources(id) on delete set null,
  last_verified_at date,
  created_at timestamptz not null default now()
);
create index on public.deadlines (university_program_id);
