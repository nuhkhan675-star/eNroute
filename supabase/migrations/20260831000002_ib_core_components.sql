-- IB Diploma's core is TOK + EE + CAS. CAS is completion-based (no letter
-- grade), but TOK and EE are each individually graded A (best) to E (worst)
-- -- distinct from the 1-7 scale used for the 6 subjects, and with no HL/SL
-- level. These were missing from the initial subject catalog.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array[]::text[], 'A-E'
from public.curricula, unnest(array[
  'Theory of Knowledge','Extended Essay'
]) as subj(name)
where curricula.code = 'IB'
on conflict (curriculum_id, name) do nothing;
