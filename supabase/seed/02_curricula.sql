-- All curricula the onboarding dropdown offers. Subjects are seeded in depth
-- for IB, A Levels, and CBSE for the MVP (03_subjects.sql); the rest exist so
-- the dropdown is complete and are easy to extend with subjects later.
insert into public.curricula (code, name) values
('IB','IB Diploma'),
('A_LEVELS','A Levels'),
('CBSE','CBSE'),
('ICSE','ICSE'),
('ISC','ISC'),
('AP','AP'),
('US_HS_DIPLOMA','American High School Diploma'),
('AU_CURRICULUM','Australian Curriculum'),
('OTHER','Other')
on conflict (code) do nothing;
