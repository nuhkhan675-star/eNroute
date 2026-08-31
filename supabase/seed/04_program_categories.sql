-- Standardized program taxonomy. This is what university_programs.category
-- (via programs.category_id) keys off of for factual filtering, and what
-- messy real-world degree titles ("BSc Finance", "Bachelor of Finance",
-- "Finance BBA") all map onto. Full taxonomy seeded now even though only a
-- few categories have real university_programs rows in the MVP -- that's
-- expected, not a bug: unseeded combinations should honestly return "no
-- matches yet" rather than a fabricated result.
insert into public.program_categories (code, name, parent_group) values
-- Business & Commerce
('ACCOUNTING','Accounting','Business & Commerce'),
('FINANCE','Finance','Business & Commerce'),
('BUSINESS_ADMINISTRATION','Business Administration','Business & Commerce'),
('ECONOMICS','Economics','Business & Commerce'),
('MARKETING','Marketing','Business & Commerce'),
('INTERNATIONAL_BUSINESS','International Business','Business & Commerce'),
('BUSINESS_ANALYTICS','Business Analytics','Business & Commerce'),
('MANAGEMENT','Management','Business & Commerce'),
('ENTREPRENEURSHIP','Entrepreneurship','Business & Commerce'),
('SUPPLY_CHAIN_MANAGEMENT','Supply Chain Management','Business & Commerce'),
('INTERNATIONAL_TRADE','International Trade','Business & Commerce'),
('BANKING','Banking','Business & Commerce'),
('ACTUARIAL_SCIENCE','Actuarial Science','Business & Commerce'),
('HUMAN_RESOURCES','Human Resources','Business & Commerce'),
('HOSPITALITY_MANAGEMENT','Hospitality Management','Business & Commerce'),
('TOURISM_MANAGEMENT','Tourism Management','Business & Commerce'),
-- Computer Science & Technology
('COMPUTER_SCIENCE','Computer Science','Computer Science & Technology'),
('SOFTWARE_ENGINEERING','Software Engineering','Computer Science & Technology'),
('DATA_SCIENCE','Data Science','Computer Science & Technology'),
('ARTIFICIAL_INTELLIGENCE','Artificial Intelligence','Computer Science & Technology'),
('CYBERSECURITY','Cybersecurity','Computer Science & Technology'),
('INFORMATION_TECHNOLOGY','Information Technology','Computer Science & Technology'),
('INFORMATION_SYSTEMS','Information Systems','Computer Science & Technology'),
('COMPUTER_ENGINEERING','Computer Engineering','Computer Science & Technology'),
-- Engineering
('MECHANICAL_ENGINEERING','Mechanical Engineering','Engineering'),
('ELECTRICAL_ENGINEERING','Electrical Engineering','Engineering'),
('CIVIL_ENGINEERING','Civil Engineering','Engineering'),
('CHEMICAL_ENGINEERING','Chemical Engineering','Engineering'),
('AEROSPACE_ENGINEERING','Aerospace Engineering','Engineering'),
('BIOMEDICAL_ENGINEERING','Biomedical Engineering','Engineering'),
('ENVIRONMENTAL_ENGINEERING','Environmental Engineering','Engineering'),
('INDUSTRIAL_ENGINEERING','Industrial Engineering','Engineering'),
-- Science
('PHYSICS','Physics','Science'),
('CHEMISTRY','Chemistry','Science'),
('BIOLOGY','Biology','Science'),
('MATHEMATICS','Mathematics','Science'),
('BIOTECHNOLOGY','Biotechnology','Science'),
('ENVIRONMENTAL_SCIENCE','Environmental Science','Science'),
-- Medicine & Health
('MEDICINE','Medicine','Medicine & Health'),
('DENTISTRY','Dentistry','Medicine & Health'),
('NURSING','Nursing','Medicine & Health'),
('PHARMACY','Pharmacy','Medicine & Health'),
('PHYSIOTHERAPY','Physiotherapy','Medicine & Health'),
('PUBLIC_HEALTH','Public Health','Medicine & Health'),
('BIOMEDICAL_SCIENCES','Biomedical Sciences','Medicine & Health'),
('NUTRITION','Nutrition','Medicine & Health'),
-- Law
('LAW','Law','Law'),
('INTERNATIONAL_LAW','International Law','Law'),
('CORPORATE_LAW','Corporate Law','Law'),
-- Social Sciences
('PSYCHOLOGY','Psychology','Social Sciences'),
('SOCIOLOGY','Sociology','Social Sciences'),
('POLITICAL_SCIENCE','Political Science','Social Sciences'),
('INTERNATIONAL_RELATIONS','International Relations','Social Sciences'),
('ANTHROPOLOGY','Anthropology','Social Sciences'),
-- Humanities
('ENGLISH','English','Humanities'),
('HISTORY','History','Humanities'),
('PHILOSOPHY','Philosophy','Humanities'),
('LANGUAGES','Languages','Humanities'),
('LITERATURE','Literature','Humanities'),
-- Arts & Design
('ARCHITECTURE','Architecture','Arts & Design'),
('GRAPHIC_DESIGN','Graphic Design','Arts & Design'),
('FASHION_DESIGN','Fashion Design','Arts & Design'),
('INDUSTRIAL_DESIGN','Industrial Design','Arts & Design'),
('FINE_ARTS','Fine Arts','Arts & Design'),
('FILM','Film','Arts & Design'),
('ANIMATION','Animation','Arts & Design')
on conflict (code) do nothing;
