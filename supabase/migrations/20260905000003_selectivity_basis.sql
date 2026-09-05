-- Store WHERE a prediction's selectivity signal came from, so the UI can be
-- honest about it: a real published acceptance rate is shown plainly, while
-- a rank-derived or AI-derived figure is labelled as an estimate. Previously
-- this was only smuggled into the free-text university_data_version column
-- ("stats:2025" / "rank:29" / "ai_estimate:62"), which the UI couldn't rely
-- on. Mirrors SelectivityResult.basis in lib/ai/prediction/selectivity.ts.
alter table public.university_analysis
  add column selectivity_basis text
  check (selectivity_basis in ('acceptance_rate', 'ai_estimate', 'rank_proxy', 'unknown'));

-- Backfill from the existing version string so already-computed rows don't
-- have to be re-analyzed (which would cost real Gemini calls).
update public.university_analysis
set selectivity_basis = case
  when university_data_version like 'stats:%' then 'acceptance_rate'
  when university_data_version like 'ai_estimate:%' then 'ai_estimate'
  when university_data_version like 'rank:%' then 'rank_proxy'
  else 'unknown'
end
where selectivity_basis is null;

-- The acceptance rate that was actually used, so the card can show the
-- number alongside its label without re-deriving it.
alter table public.university_analysis add column selectivity_rate numeric;
