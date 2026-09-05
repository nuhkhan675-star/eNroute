-- Remove the "ai_estimate" selectivity basis. Asking the model to invent a
-- plausible acceptance rate produced a number with no source, URL or date,
-- which contradicts this app's data-provenance rule that every published
-- statistic must be traceable. Selectivity now comes only from a real
-- published rate, a ranking-derived proxy, or an honest "unknown".

-- Any analysis computed off an invented rate rests on an unsound baseline,
-- so delete those rows rather than silently relabelling them -- they'll be
-- recomputed from a legitimate basis on next analysis.
delete from public.university_analysis where selectivity_basis = 'ai_estimate';

alter table public.university_analysis drop constraint if exists university_analysis_selectivity_basis_check;
alter table public.university_analysis
  add constraint university_analysis_selectivity_basis_check
  check (selectivity_basis in ('acceptance_rate', 'rank_proxy', 'unknown'));
