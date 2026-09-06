-- Full subject catalogs for every named curriculum (all but 'Other', which
-- has no standardized subject list by design). Reflects each board's real
-- subject offerings, including heritage/community languages such as Hindi
-- and Urdu where that board actually offers them.

-- IB Diploma: HL/SL, 1-7 scale.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array['HL','SL'], '1-7'
from public.curricula, unnest(array[
  'Mathematics: Analysis and Approaches','Mathematics: Applications and Interpretation',
  'Biology','Chemistry','Physics','Computer Science','Design Technology',
  'Environmental Systems and Societies','Sports Exercise and Health Science',
  'Economics','Business Management','Psychology','History','Geography','Philosophy',
  'Global Politics','Anthropology','World Religions',
  'English A: Literature','English A: Language and Literature',
  'Hindi A: Literature','French A: Literature','Spanish A: Literature',
  'English B','French B','Spanish B','German B','Hindi B','Mandarin B','Japanese B',
  'Visual Arts','Music','Theatre','Film','Dance','Literature and Performance'
]) as subj(name)
where curricula.code = 'IB'
on conflict (curriculum_id, name) do nothing;

-- IB Language ab initio: a separate statement because these are SL-only. The
-- block above hardcodes array['HL','SL'], which would have offered an HL that
-- does not exist for these subjects.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array['SL'], '1-7'
from public.curricula, unnest(array[
  'French ab initio','Spanish ab initio','German ab initio','Mandarin ab initio',
  'Italian ab initio','Japanese ab initio','Arabic ab initio'
]) as subj(name)
where curricula.code = 'IB'
on conflict do nothing

-- A Levels: no HL/SL, A*-E scale.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array[]::text[], 'A*-E'
from public.curricula, unnest(array[
  'Mathematics','Further Mathematics','Biology','Chemistry','Physics','Computer Science',
  'Economics','Business','Accounting','Psychology','Sociology','Politics','Philosophy','Law',
  'History','Geography','English Literature','English Language',
  'French','Spanish','German','Hindi','Urdu','Chinese',
  'Art and Design','Design and Technology','Drama and Theatre','Film Studies','Media Studies',
  'Music','Physical Education','Religious Studies','Environmental Science','Statistics',
  'Government and Politics'
]) as subj(name)
where curricula.code = 'A_LEVELS'
on conflict (curriculum_id, name) do nothing;

-- CBSE: no levels, 0-100 marks scale.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array[]::text[], '0-100'
from public.curricula, unnest(array[
  'Mathematics','Physics','Chemistry','Biology','Computer Science','Informatics Practices',
  'Biotechnology','Economics','Business Studies','Accountancy','Entrepreneurship',
  'History','Geography','Political Science','Psychology','Sociology','Philosophy',
  'English Core','Hindi Core','Hindi Elective','Sanskrit',
  'Physical Education','Fine Arts','Home Science','Legal Studies','Mass Media Studies'
]) as subj(name)
where curricula.code = 'CBSE'
on conflict (curriculum_id, name) do nothing;

-- ICSE (Class 10): no levels, 0-100 marks scale.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array[]::text[], '0-100'
from public.curricula, unnest(array[
  'English','Hindi','Sanskrit','French','Mathematics','Physics','Chemistry','Biology',
  'History Civics and Geography','Economics','Commercial Studies','Computer Applications',
  'Physical Education','Environmental Science','Art','Economic Applications',
  'Commercial Applications','Performing Arts'
]) as subj(name)
where curricula.code = 'ICSE'
on conflict (curriculum_id, name) do nothing;

-- ISC (Class 12): no levels, 0-100 marks scale.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array[]::text[], '0-100'
from public.curricula, unnest(array[
  'English','Elective English','Hindi','Sanskrit','Mathematics','Physics','Chemistry',
  'Biology','Computer Science','Economics','Commerce','Accounts','Business Studies',
  'History','Political Science','Geography','Sociology','Psychology',
  'Environmental Science','Physical Education','Art','Home Science',
  'Mass Media and Communication'
]) as subj(name)
where curricula.code = 'ISC'
on conflict (curriculum_id, name) do nothing;

-- AP: College Board's actual course list, no levels, 1-5 exam scale.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array[]::text[], '1-5'
from public.curricula, unnest(array[
  'AP Calculus AB','AP Calculus BC','AP Statistics',
  'AP Biology','AP Chemistry','AP Physics 1','AP Physics 2',
  'AP Physics C: Mechanics','AP Physics C: Electricity and Magnetism',
  'AP Computer Science A','AP Computer Science Principles','AP Environmental Science',
  'AP Psychology','AP Macroeconomics','AP Microeconomics',
  'AP US History','AP World History','AP European History',
  'AP US Government and Politics','AP Comparative Government and Politics',
  'AP Human Geography',
  'AP English Language and Composition','AP English Literature and Composition',
  'AP Spanish Language','AP French Language','AP Chinese Language',
  'AP Art History','AP Studio Art','AP Music Theory'
]) as subj(name)
where curricula.code = 'AP'
on conflict (curriculum_id, name) do nothing;

-- American High School Diploma: no levels, A-F letter-grade scale.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array[]::text[], 'A-F'
from public.curricula, unnest(array[
  'English','Algebra I','Algebra II','Geometry','Pre-Calculus','Calculus','Statistics',
  'Biology','Chemistry','Physics','Environmental Science',
  'World History','US History','US Government','Economics',
  'Spanish','French','Mandarin',
  'Computer Science','Art','Music','Physical Education','Health','Psychology','Sociology'
]) as subj(name)
where curricula.code = 'US_HS_DIPLOMA'
on conflict (curriculum_id, name) do nothing;

-- Australian Curriculum (senior secondary): no levels, A-E band scale.
insert into public.subjects (curriculum_id, name, available_levels, grade_scale)
select id, subj.name, array[]::text[], 'A-E'
from public.curricula, unnest(array[
  'English','Mathematical Methods','Specialist Mathematics','General Mathematics',
  'Biology','Chemistry','Physics','Psychology','Economics','Business Management',
  'Legal Studies','History','Geography','Politics','Computer Science',
  'Visual Arts','Music','Drama','Physical Education','French','Chinese','Japanese','Indonesian'
]) as subj(name)
where curricula.code = 'AU_CURRICULUM'
on conflict (curriculum_id, name) do nothing;
