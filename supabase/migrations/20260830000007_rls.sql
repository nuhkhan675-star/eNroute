-- Row Level Security is the real access boundary here, not just app-layer
-- checks. Reference/university tables: public read, service-role-only write
-- (no insert/update/delete policy for anon/authenticated means only the
-- RLS-bypassing service role can write). Student-owned tables: scoped to
-- auth.uid() via the student_profiles.user_id chain.

alter table public.countries enable row level security;
alter table public.curricula enable row level security;
alter table public.subjects enable row level security;
alter table public.data_sources enable row level security;
alter table public.program_categories enable row level security;
alter table public.programs enable row level security;
alter table public.universities enable row level security;
alter table public.university_programs enable row level security;
alter table public.admission_requirements enable row level security;
alter table public.admission_statistics enable row level security;
alter table public.tuition enable row level security;
alter table public.scholarships enable row level security;
alter table public.deadlines enable row level security;

create policy "public read" on public.countries for select using (true);
create policy "public read" on public.curricula for select using (true);
create policy "public read" on public.subjects for select using (true);
create policy "public read" on public.data_sources for select using (true);
create policy "public read" on public.program_categories for select using (true);
create policy "public read" on public.programs for select using (true);
create policy "public read" on public.universities for select using (true);
create policy "public read" on public.university_programs for select using (true);
create policy "public read" on public.admission_requirements for select using (true);
create policy "public read" on public.admission_statistics for select using (true);
create policy "public read" on public.tuition for select using (true);
create policy "public read" on public.scholarships for select using (true);
create policy "public read" on public.deadlines for select using (true);

alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_subjects enable row level security;
alter table public.extracurriculars enable row level security;
alter table public.student_countries enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy "own row select" on public.users for select using (id = auth.uid());
create policy "own row update" on public.users for update using (id = auth.uid());

create policy "own profile" on public.student_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own subjects" on public.student_subjects for all
  using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));

create policy "own extracurriculars" on public.extracurriculars for all
  using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));

create policy "own countries" on public.student_countries for all
  using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));

create policy "own analyses" on public.ai_analyses for all
  using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));

create policy "own conversations" on public.chat_conversations for all
  using (profile_id in (select id from public.student_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from public.student_profiles where user_id = auth.uid()));

create policy "own messages" on public.chat_messages for all
  using (conversation_id in (
    select cc.id from public.chat_conversations cc
    join public.student_profiles sp on sp.id = cc.profile_id
    where sp.user_id = auth.uid()
  ))
  with check (conversation_id in (
    select cc.id from public.chat_conversations cc
    join public.student_profiles sp on sp.id = cc.profile_id
    where sp.user_id = auth.uid()
  ));
