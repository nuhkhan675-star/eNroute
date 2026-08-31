-- MVP university/program seed. Structural facts (name, city, country,
-- website, degree offered) are stable, well-known facts and are seeded in
-- full. Quantitative facts (acceptance rate, tuition, scholarships,
-- deadlines) are seeded ONLY where verified against an official source at
-- seed-writing time via a live fetch -- everything else is deliberately left
-- unseeded rather than guessed, per the "never invent statistics" rule.
-- Extend this file (or use the admin/service-role path) as more verified
-- data becomes available.

insert into public.data_sources (name, url, source_type, reliability_tier) values
('MIT Admissions - Facts & Stats', 'https://mitadmissions.org/apply/process/stats/', 'official', 'high'),
('University of Toronto - Quick Facts', 'https://www.utoronto.ca/about-u-of-t/quick-facts', 'official', 'high'),
('MIT official website', 'https://www.mit.edu', 'official', 'high'),
('NYU Stern official website', 'https://www.stern.nyu.edu', 'official', 'high'),
('Georgia Tech official website', 'https://www.gatech.edu', 'official', 'high'),
('Imperial College London official website', 'https://www.imperial.ac.uk', 'official', 'high'),
('University of Manchester official website', 'https://www.manchester.ac.uk', 'official', 'high'),
('LSE official website', 'https://www.lse.ac.uk', 'official', 'high'),
('NTU Singapore official website', 'https://www.ntu.edu.sg', 'official', 'high'),
('NUS official website', 'https://www.nus.edu.sg', 'official', 'high'),
('University of Toronto official website', 'https://www.utoronto.ca', 'official', 'high'),
('McGill University official website', 'https://www.mcgill.ca', 'official', 'high')
on conflict do nothing;

-- Universities
insert into public.universities (name, country_id, city, website, university_type, data_source_id, data_year, last_verified_at)
select 'Massachusetts Institute of Technology', c.id, 'Cambridge', 'https://www.mit.edu', 'private',
       (select id from public.data_sources where name = 'MIT official website'), 2026, current_date
from public.countries c where c.iso_code = 'US'
union all
select 'New York University (Stern School of Business)', c.id, 'New York', 'https://www.stern.nyu.edu', 'private',
       (select id from public.data_sources where name = 'NYU Stern official website'), 2026, current_date
from public.countries c where c.iso_code = 'US'
union all
select 'Georgia Institute of Technology', c.id, 'Atlanta', 'https://www.gatech.edu', 'public',
       (select id from public.data_sources where name = 'Georgia Tech official website'), 2026, current_date
from public.countries c where c.iso_code = 'US'
union all
select 'Imperial College London', c.id, 'London', 'https://www.imperial.ac.uk', 'public',
       (select id from public.data_sources where name = 'Imperial College London official website'), 2026, current_date
from public.countries c where c.iso_code = 'GB'
union all
select 'University of Manchester', c.id, 'Manchester', 'https://www.manchester.ac.uk', 'public',
       (select id from public.data_sources where name = 'University of Manchester official website'), 2026, current_date
from public.countries c where c.iso_code = 'GB'
union all
select 'London School of Economics and Political Science', c.id, 'London', 'https://www.lse.ac.uk', 'public',
       (select id from public.data_sources where name = 'LSE official website'), 2026, current_date
from public.countries c where c.iso_code = 'GB'
union all
select 'Nanyang Technological University', c.id, 'Singapore', 'https://www.ntu.edu.sg', 'public',
       (select id from public.data_sources where name = 'NTU Singapore official website'), 2026, current_date
from public.countries c where c.iso_code = 'SG'
union all
select 'National University of Singapore', c.id, 'Singapore', 'https://www.nus.edu.sg', 'public',
       (select id from public.data_sources where name = 'NUS official website'), 2026, current_date
from public.countries c where c.iso_code = 'SG'
union all
select 'University of Toronto', c.id, 'Toronto', 'https://www.utoronto.ca', 'public',
       (select id from public.data_sources where name = 'University of Toronto official website'), 2026, current_date
from public.countries c where c.iso_code = 'CA'
union all
select 'McGill University', c.id, 'Montreal', 'https://www.mcgill.ca', 'public',
       (select id from public.data_sources where name = 'McGill University official website'), 2026, current_date
from public.countries c where c.iso_code = 'CA';

-- University programs (one MVP program per university, matched to the
-- canonical programs seeded in 05_programs.sql via program_categories.code)
insert into public.university_programs (university_id, program_id, display_name, degree_level, duration_years, delivery_mode)
select u.id, p.id, name_pair.display_name, 'bachelor', name_pair.duration, 'on_campus'
from (values
  ('Massachusetts Institute of Technology', 'COMPUTER_SCIENCE', 'Computer Science and Engineering (6-3)', 4),
  ('New York University (Stern School of Business)', 'FINANCE', 'BS in Business, Finance', 4),
  ('Georgia Institute of Technology', 'MECHANICAL_ENGINEERING', 'BS Mechanical Engineering', 4),
  ('Imperial College London', 'COMPUTER_SCIENCE', 'BEng Computing', 3),
  ('University of Manchester', 'MECHANICAL_ENGINEERING', 'BEng Mechanical Engineering', 3),
  ('London School of Economics and Political Science', 'FINANCE', 'BSc Accounting and Finance', 3),
  ('Nanyang Technological University', 'BUSINESS_ADMINISTRATION', 'Nanyang Business School - Business (BBA)', 4),
  ('National University of Singapore', 'COMPUTER_SCIENCE', 'BComp Computer Science', 4),
  ('University of Toronto', 'COMPUTER_SCIENCE', 'Computer Science Specialist (BSc)', 4),
  ('McGill University', 'FINANCE', 'Bachelor of Commerce, Finance', 4)
) as name_pair(university_name, category_code, display_name, duration)
join public.universities u on u.name = name_pair.university_name
join public.program_categories pc on pc.code = name_pair.category_code
join public.programs p on p.category_id = pc.id and p.degree_level = 'bachelor';

-- The one admission-statistics figure verified against an official source at
-- seed-writing time (MIT's institute-wide acceptance rate -- MIT admits to
-- the Institute, not by department, so this applies to the CS program too).
insert into public.admission_statistics (university_program_id, year, acceptance_rate, applicant_count, admitted_count, confidence, data_source_id, last_verified_at)
select up.id, 2025, 4.6, 29281, 1334, 'high',
       (select id from public.data_sources where name = 'MIT Admissions - Facts & Stats'),
       current_date
from public.university_programs up
join public.universities u on u.id = up.university_id
where u.name = 'Massachusetts Institute of Technology';
