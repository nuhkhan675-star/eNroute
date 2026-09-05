-- A few common fields of study missing from the catalog, needed to tag
-- university strengths for the curated 150-university dataset (e.g. many
-- entries list bare "Engineering" without a specific discipline).
insert into public.program_categories (code, name, parent_group) values
  ('ENGINEERING', 'Engineering', 'Engineering'),
  ('JOURNALISM', 'Journalism', 'Humanities'),
  ('PUBLIC_POLICY', 'Public Policy', 'Social Sciences'),
  ('COMMUNICATIONS', 'Communications', 'Humanities');
