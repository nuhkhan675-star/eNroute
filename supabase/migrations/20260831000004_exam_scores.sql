-- Standardized test scores, replacing the removed budget step. Score is text
-- since formats differ wildly across exams (SAT 400-1600, IELTS 0-9 bands,
-- TOEFL 0-120, etc.) -- validating/interpreting the number is a UI concern,
-- not a schema one.
create table public.exam_scores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  exam_type text not null check (exam_type in (
    'SAT','ACT','IELTS','TOEFL_IBT','DUOLINGO','GRE','GMAT','PTE_ACADEMIC','OTHER'
  )),
  score text not null,
  created_at timestamptz not null default now()
);
create index on public.exam_scores (profile_id);

alter table public.exam_scores enable row level security;
create policy "own exam scores" on public.exam_scores for all
  using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));
