# AI-Powered University Admissions Advisor

A full-stack admissions advisory app: students build a profile (curriculum, subjects/grades,
extracurriculars, intended program, preferred countries, optional budget), get matched against a
factual university/program database, receive a multi-agent AI analysis (academic, extracurricular,
major fit, scholarship, cost, and a final strategist), and can chat with an advisor grounded in their
own stored profile and analyses.

See [`C:\Users\Admin\.claude\plans\sequential-tinkering-piglet.md`](../../.claude/plans) (or ask
Claude) for the full architecture writeup. Short version:

- **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** for the frontend.
- **Supabase Postgres** for all data, with Row Level Security as the real access boundary.
- **Google Gemini API** (free tier), server-only, for the AI analysis pipeline and chat.
- University/program **matching is deterministic SQL** (`lib/matching/universityMatcher.ts`) --
  the AI never decides which universities offer which programs. Reach/Target/Likely
  classification is a deterministic function (`lib/ai/classification.ts`) informed by AI scores
  and factual acceptance-rate data, never an AI-invented probability.

## Prerequisites

- Node.js 20+ (this repo was built against Node 24 LTS)
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier, no billing required)

## 1. Set up Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Grab your project URL, anon key, and service role key from **Project Settings -> API**.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
4. Link the CLI to your project and push the schema + seed data:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npm run db:push   # applies supabase/migrations/*.sql
   npm run db:seed   # applies migrations + supabase/seed/*.sql (reference data + MVP universities)
   ```

   `supabase/migrations/` creates every table, RLS policy, and trigger described in the plan.
   `supabase/seed/` populates countries, curricula/subjects (IB, A Levels, CBSE), the full
   standardized program taxonomy, and an MVP set of ~10 real universities across the US, UK,
   Singapore, and Canada. Quantitative facts (acceptance rates, tuition) are seeded **only** where
   verified against an official source at seed-writing time -- everything else is left null rather
   than guessed. Extend the dataset by adding more `supabase/seed/*.sql` files or through the
   service-role client.

5. Regenerate TypeScript types against your real schema (replaces the permissive placeholder in
   `lib/supabase/database.types.ts`):

   ```bash
   npm run db:types
   ```

## 2. Run the app

```bash
npm install
npm run dev
```

Open http://localhost:3000. Sign up, complete onboarding, click **Analyze My Profile**, then
explore recommendations, a specific university, and the chat advisor.

## Project layout

- `app/` -- routes: landing, auth, onboarding wizard, dashboard, university search/detail/program
  analysis, chat.
- `components/` -- UI, grouped by feature (`onboarding/`, `dashboard/`, `universities/`, `chat/`).
- `lib/db/` -- all Supabase query logic (reference data, profiles, universities, analyses, chat).
- `lib/matching/` -- deterministic university/program filtering.
- `lib/ai/` -- Claude client wrapper, per-agent schemas + prompts (`agents/`), the orchestrator,
  deterministic classification/cost-estimate functions, and the chat context builder.
- `lib/actions/` -- Next.js Server Actions (auth, onboarding submit, chat profile-update confirm).
- `supabase/migrations/` -- schema, RLS policies, triggers.
- `supabase/seed/` -- reference data + MVP university dataset.

## Notes / known limitations of this MVP

- Only IB, A Levels, and CBSE have seeded subject catalogs; other curricula (ICSE, ISC, AP, etc.)
  exist as dropdown options but need subjects added the same way (`supabase/seed/03_subjects.sql`).
- The MVP university dataset covers Computer Science, Finance, Business Administration, and
  Mechanical Engineering across 4 countries -- Medicine and other categories/countries are easy to
  extend via the same seed pattern, but aren't populated yet.
- Per-university AI analysis is capped at the top 10 matched programs per "Analyze My Profile" run
  to bound AI call volume/latency; this is configurable in `lib/ai/orchestrator.ts`
  (`MAX_UNIVERSITY_ANALYSES`).
- No admin UI yet for editing university/program data -- use the Supabase dashboard's table editor
  or the service-role client (`lib/supabase/server.ts`'s `createServiceRoleClient`) directly. The
  schema is designed so the frontend automatically reflects whatever's in the tables.
