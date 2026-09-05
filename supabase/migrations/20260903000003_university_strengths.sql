-- A university's known subject strengths are a lightweight informational
-- tag ("known for X"), not the same thing as a formal, analyzable degree
-- program (which has its own admission requirements, tuition, etc via
-- university_programs). Keeping them separate so the UI never presents a
-- bare strength label as if it were a real applyable program.
create table public.university_strengths (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  category_id uuid not null references public.program_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (university_id, category_id)
);
create index on public.university_strengths (university_id);

alter table public.university_strengths enable row level security;
create policy "public read access" on public.university_strengths for select using (true);
