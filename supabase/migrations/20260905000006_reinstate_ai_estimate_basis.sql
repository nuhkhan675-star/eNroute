-- Reinstate the "ai_estimate" selectivity basis, reversing migration
-- 20260905000004 -- but as a strictly THIRD-tier fallback rather than the
-- free-for-all it was before.
--
-- Why this is different from what was removed:
--   * It is only ever reached when a university has NO real published
--     acceptance rate AND NO ranking -- it can never displace real data.
--   * The model is allowed to decline: when it has no genuine knowledge of a
--     school it returns null and the basis stays 'unknown'. The original
--     version forced a number out of the model every time, which is what
--     produced sourceless figures.
--   * It is pinned to "low" confidence in scoringEngine.ts, so it widens the
--     displayed range rather than narrowing it (see the note there -- without
--     that pin, an invented rate would have read as MORE certain than an
--     honest "unknown", which is the exact opposite of the intent).
--   * The UI labels it distinctly and more loudly than rank_proxy.
--
-- Unlike migration 0004, this one deletes nothing: rows currently sitting at
-- 'unknown' are still perfectly valid, and will move to 'ai_estimate' only
-- when they are next re-analyzed.
alter table public.university_analysis drop constraint if exists university_analysis_selectivity_basis_check;
alter table public.university_analysis
  add constraint university_analysis_selectivity_basis_check
  check (selectivity_basis in ('acceptance_rate', 'rank_proxy', 'ai_estimate', 'unknown'));
