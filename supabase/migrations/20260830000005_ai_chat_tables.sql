-- AI analysis outputs and chat history. Owned by the student via profile_id,
-- versioned (never overwritten) so a profile edit can be diffed against
-- history instead of silently destroying prior context.

create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  university_program_id uuid references public.university_programs(id) on delete cascade,
  analysis_type text not null check (analysis_type in (
    'academic','extracurricular','major_fit','scholarship','cost','final_strategy'
  )),
  input_snapshot jsonb not null,
  output jsonb not null,
  model_used text not null,
  created_at timestamptz not null default now()
);
create index on public.ai_analyses (profile_id, analysis_type, created_at desc);
create index on public.ai_analyses (university_program_id);

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.student_profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.chat_conversations (profile_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  referenced_analysis_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);
create index on public.chat_messages (conversation_id, created_at);
