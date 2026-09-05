-- Canonical, structured admission-prediction results. Replaces reconstructing
-- a "bundle" from generic ai_analyses rows -- one row per (profile, program),
-- upserted on re-analysis. model_version/university_data_version exist so a
-- future methodology change (or a university's data being updated) can be
-- distinguished from a stale prediction, and so results can eventually be
-- compared against historical outcomes for calibration.
create table public.university_analysis (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  university_program_id uuid not null references public.university_programs(id) on delete cascade,

  chance_min int not null check (chance_min >= 0 and chance_min <= 100),
  chance_max int not null check (chance_max >= chance_min and chance_max <= 100),
  category text not null check (category in ('high_reach', 'reach', 'target', 'likely')),
  selectivity_level text not null check (selectivity_level in ('extreme', 'very_high', 'high', 'moderate', 'low')),

  academic_score int not null check (academic_score between 0 and 100),
  program_fit_score int not null check (program_fit_score between 0 and 100),
  extracurricular_score int not null check (extracurricular_score between 0 and 100),
  leadership_score int not null check (leadership_score between 0 and 100),
  achievement_score int not null check (achievement_score between 0 and 100),
  requirements_fit_score int not null check (requirements_fit_score between 0 and 100),

  strengths jsonb not null default '[]',
  gaps jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  reasoning text not null default '',
  confidence text not null check (confidence in ('high', 'moderate', 'low')),

  model_version text not null,
  university_data_version text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (profile_id, university_program_id)
);
create index on public.university_analysis (profile_id);
create index on public.university_analysis (university_program_id);

alter table public.university_analysis enable row level security;
create policy "own university analysis" on public.university_analysis
  for all using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));
