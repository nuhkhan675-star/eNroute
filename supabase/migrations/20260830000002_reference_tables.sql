-- Reference / lookup tables. Publicly readable, admin (service-role) writable.
-- These are the deterministic vocabulary that everything else keys off of --
-- program matching, subject dropdowns, and country filters all read from here
-- rather than the AI inventing or guessing values.

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  iso_code text not null unique,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.curricula (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- e.g. 'IB', 'A_LEVELS', 'CBSE'
  name text not null,                 -- e.g. 'IB Diploma'
  created_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete cascade,
  name text not null,                          -- e.g. 'Mathematics: Analysis and Approaches'
  available_levels text[] not null default '{}', -- e.g. {HL,SL}; empty if curriculum has no levels
  grade_scale text not null,                   -- e.g. '1-7', 'A*-E', '0-100'
  created_at timestamptz not null default now(),
  unique (curriculum_id, name)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  source_type text not null check (source_type in ('official','government','aggregator','survey','other')),
  reliability_tier text not null check (reliability_tier in ('high','medium','low')),
  created_at timestamptz not null default now()
);

create table public.program_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- e.g. 'FINANCE'
  name text not null,                 -- e.g. 'Finance'
  parent_group text not null,         -- e.g. 'Business & Commerce'
  created_at timestamptz not null default now()
);
create index on public.program_categories (parent_group);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.program_categories(id) on delete restrict,
  name text not null,                 -- canonical name, e.g. 'Computer Science'
  degree_level text not null check (degree_level in ('bachelor','master','phd','diploma','foundation')),
  created_at timestamptz not null default now(),
  unique (category_id, name, degree_level)
);
