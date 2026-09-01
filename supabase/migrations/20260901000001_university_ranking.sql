-- Global/national ranking, sourced only (e.g. QS World University Rankings)
-- -- never AI-estimated. Nullable: most universities in our database are not
-- ranked by any major body, and we show "Not ranked" honestly rather than
-- inventing a number. Provenance reuses the existing data_source_id/data_year/
-- last_verified_at columns already on this table.
alter table public.universities add column ranking int;
