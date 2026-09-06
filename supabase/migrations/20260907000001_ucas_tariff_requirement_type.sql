-- Add 'ucas_tariff' to the allowed requirement types.
--
-- SAT and ACT are the wrong axis for UK universities: they publish entry
-- requirements as UCAS Tariff points, not US test scores, so a UK school could
-- not have its entry bar recorded at all.
--
-- Postgres cannot widen a check constraint in place, so it is dropped and
-- recreated. This only ADDS a permitted value -- every existing sat_* and
-- act_composite row still satisfies the new constraint, so no data is touched
-- and the recreate cannot fail on existing rows.
alter table public.university_admission_requirements
  drop constraint university_admission_requirements_requirement_type_check;

alter table public.university_admission_requirements
  add constraint university_admission_requirements_requirement_type_check
  check (requirement_type in (
    'sat_total', 'sat_math', 'sat_reading', 'act_composite', 'ucas_tariff'
  ));

comment on constraint university_admission_requirements_requirement_type_check
  on public.university_admission_requirements is
  'ucas_tariff rows follow the same convention as the SAT/ACT ones: min_value and max_value are a 25th-75th percentile band for admitted students, never a hard cutoff.';
