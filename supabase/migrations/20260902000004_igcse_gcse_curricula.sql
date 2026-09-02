-- IGCSE/GCSE are common Grade 10 boards distinct from the post-10th
-- curricula already seeded (A Levels, IB, etc.) -- needed so the Grade 10
-- board dropdown can offer a real match instead of forcing "Other".
insert into public.curricula (code, name) values
  ('IGCSE', 'IGCSE'),
  ('GCSE', 'GCSE')
on conflict (code) do nothing;
