-- Prior academic history: the student's overall Grade 10 / secondary-school
-- result (percentage, CGPA, or GPA -- grading systems vary too much to
-- structure further). Free text, optional since not every curriculum has a
-- distinct Grade 10 milestone.
alter table public.student_profiles add column grade_10_result text;
