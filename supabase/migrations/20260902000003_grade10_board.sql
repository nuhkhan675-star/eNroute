-- Which board/curriculum the Grade 10 result was under (e.g. IGCSE, CBSE) --
-- often different from the student's current (post-10th) curriculum.
alter table public.student_profiles add column grade_10_board text;
