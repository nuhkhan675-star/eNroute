-- Add 'entrance_exam' to the allowed requirement types.
--
-- SAT/ACT/UCAS all assume a standardised score an applicant already holds.
-- Much of the world admits on an institution's OWN entrance test instead --
-- India especially, where JEE, CUET and institutional papers like IAQS's QAT
-- are the actual gate. There was no way to record that at all.
--
-- Note on min_value/max_value for this type: leave them NULL. The other types
-- store a 25th-75th percentile band of admitted students, and an entrance-exam
-- pass mark is a categorically different thing -- a hard cutoff, not a
-- distribution. Putting a cutoff in a column documented as a percentile band
-- would quietly corrupt the meaning of every other row. The threshold belongs
-- in the description, which is what reaches the analyst anyway.
alter table public.university_admission_requirements
  drop constraint university_admission_requirements_requirement_type_check;

alter table public.university_admission_requirements
  add constraint university_admission_requirements_requirement_type_check
  check (requirement_type in (
    'sat_total', 'sat_math', 'sat_reading', 'act_composite', 'ucas_tariff', 'entrance_exam'
  ));
