-- Canonical bachelor-level program templates for the MVP-seeded categories
-- (Computer Science, Finance/Business, Mechanical Engineering, Medicine).
-- Extend this file as more university_programs rows are added for other
-- categories.
insert into public.programs (category_id, name, degree_level)
select id, 'Computer Science', 'bachelor' from public.program_categories where code = 'COMPUTER_SCIENCE'
on conflict do nothing;

insert into public.programs (category_id, name, degree_level)
select id, 'Finance', 'bachelor' from public.program_categories where code = 'FINANCE'
on conflict do nothing;

insert into public.programs (category_id, name, degree_level)
select id, 'Business Administration', 'bachelor' from public.program_categories where code = 'BUSINESS_ADMINISTRATION'
on conflict do nothing;

insert into public.programs (category_id, name, degree_level)
select id, 'Mechanical Engineering', 'bachelor' from public.program_categories where code = 'MECHANICAL_ENGINEERING'
on conflict do nothing;

insert into public.programs (category_id, name, degree_level)
select id, 'Medicine', 'bachelor' from public.program_categories where code = 'MEDICINE'
on conflict do nothing;
