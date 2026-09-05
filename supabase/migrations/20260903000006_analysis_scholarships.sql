alter table public.university_analysis
  add column candidate_scholarships jsonb not null default '[]';
