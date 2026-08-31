-- Student-owned data. Every table here is reachable from auth.uid() through
-- student_profiles.user_id and is locked down by RLS in a later migration.

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  curriculum_id uuid references public.curricula(id) on delete set null,
  intended_program_category_id uuid references public.program_categories(id) on delete set null,
  budget_amount numeric(12,2),
  budget_currency text,
  budget_includes_living text check (budget_includes_living in ('yes','no','not_sure')),
  profile_strength numeric(4,1),      -- cached 0-10 score, set by the latest AI analysis
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table public.student_subjects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  level text,                          -- e.g. 'HL' / 'SL'; null for curricula without levels
  grade text not null,                 -- text to span '7', 'A*', '95', etc. across curricula
  created_at timestamptz not null default now()
);
create index on public.student_subjects (profile_id);

create table public.extracurriculars (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  activity_name text not null,
  category text not null check (category in (
    'sports','leadership','volunteering','entrepreneurship','research','internship',
    'academic_competition','arts','music','technology','community_service',
    'student_organization','work_experience','other'
  )),
  role text,
  years_involved numeric(3,1),
  description text,
  achievements text,
  impact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.extracurriculars (profile_id);

create table public.student_countries (
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete cascade,
  primary key (profile_id, country_id)
);
