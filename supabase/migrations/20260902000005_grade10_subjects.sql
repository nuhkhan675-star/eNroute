-- Replace the single free-text Grade 10 result with structured
-- subject-by-subject entries (e.g. "Physics: A*"), matching how the main
-- Subjects & Grades step already works. Grade 10 subjects aren't tied to
-- the `subjects` catalog (that's scoped to post-10th curricula), so this is
-- a standalone table with a free-text subject name.
alter table public.student_profiles drop column grade_10_result;

create table public.grade_10_subjects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  subject_name text not null,
  grade text not null,
  created_at timestamptz not null default now()
);
create index on public.grade_10_subjects (profile_id);

alter table public.grade_10_subjects enable row level security;
create policy "own grade 10 subjects" on public.grade_10_subjects for all
  using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));
