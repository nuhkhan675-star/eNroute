-- Saved Schools: bookmark a university and track application status against
-- it, same ownership-RLS pattern as every other student_profiles-scoped
-- table (e.g. grade_10_subjects).
create table public.saved_universities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  status text not null default 'saved' check (status in (
    'saved', 'in_progress', 'submitted', 'accepted', 'waitlisted', 'rejected'
  )),
  created_at timestamptz not null default now(),
  unique (profile_id, university_id)
);
create index on public.saved_universities (profile_id);
alter table public.saved_universities enable row level security;
create policy "own saved universities" on public.saved_universities
  for all using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));
