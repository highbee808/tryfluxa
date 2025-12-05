# Copilot instructions for the Fluxa repository

Quick orientation to help AI coding agents be productive in this repo.

## Big picture (what to know first)
- Frontend: Vite + TypeScript React in `src/` (pages in `src/pages`, hooks in `src/hooks`, components in `src/components`). Uses Supabase client from `@supabase/supabase-js` for realtime/data.
- Backend: Supabase Edge Functions (Deno) in `supabase/functions/` (many functions, e.g., `generate-gist`, `publish-gist`, `text-to-speech`, `scrape-trends`). Functions are chained and invoked via HTTP calls like: `${SUPABASE_URL}/functions/v1/<fn>` with Bearer token.
- DB & infra: SQL migrations in `supabase/migrations/` and local configuration in `supabase/config.toml`. Storage buckets used (notably `gist-audio` and `fluxa-reactions`).

## Data & pipeline flow (core integration points)
- Pipeline: `scrape-trends` → `auto-generate-gists`/`admin-refresh-trends` → `publish-gist` → `generate-gist` → (optionally) `text-to-speech` → DB `gists` table → feed shows content.
- Common integration points:
  - Supabase functions: `supabase.functions.deploy` & `supabase.functions.invoke` are used.
  - Storage bucket: `gist-audio` used for storing audio and images (public URL usage).
  - OpenAI, NewsAPI, Guardian, MediaStack, Statpal keys are optional features for `generate-gist`.

## Important files and examples to inspect
- Frontend: `src/pages/*`, `src/hooks/*`, `src/test-publish-gist.ts` (frontend test harness).
- Supabase functions: `supabase/functions/publish-gist/index.ts`, `supabase/functions/generate-gist/index.ts`, `supabase/functions/text-to-speech/index.ts`.
- Scripts: `deploy-functions.ps1`, `update-backend-and-deploy.ps1`, `update-backend-and-deploy.sh` (PowerShell + Bash helpers), `scripts/test-pipeline-v2.ts`, `verify-migration.js`.
- Testing helpers: `test-function.js` (browser console script) and `verify-migration.js` (node script to test DB/tables/functions).

## Conventions & project-specific patterns
- Edge functions are Deno-based and use `createClient` via `esm.sh` and check `Deno.env.get()` for secrets.
- Authorization: functions check either a service role (`SB_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`) OR the anon/publishable key (`SUPABASE_ANON_KEY`), often using a `dbKey` variable. If neither is present, functions return 401/500 depending on context.
- Cron & scheduling: scheduled endpoints require `CRON_SECRET` or a `x-cron-signature`/`x-cron-secret` header. See `UPDATE_CRON_TO_10_MINUTES.sql` and `SUPABASE_SECRETS_SETUP.md`.
- Input validation: functions often use `zod` for schema validation (e.g., `publishSchema` in `publish-gist/index.ts`). Keep the schema in sync when editing function input.
- DB constraints: `gists.audio_url` used to be required — publish-gist sets `audio_url: ''` if no audio (empty string) to avoid NOT NULL failures.
- Image handling: functions attempt to store images in `gist-audio` bucket (or use external URL fallback).

## Quick Dev & Test Commands (explicit examples)
- Install & dev: `npm i` then `npm run dev` (live preview with Vite).
- Deploy functions locally (link project if not linked):
  - `supabase link --project-ref <project-ref>`
  - `supabase functions deploy <function-name>`
- Deploy all functions via PowerShell helper:
  - `.

































If anything is unclear or you want more examples around a particular part of the repository (e.g., how to add a new function, or how to wire a new secret), tell me which area you want more detail on and I'll expand the instructions with code examples and command snippets.---- Deployment helpers: `deploy-functions.ps1`, `update-backend-and-deploy.ps1`, and `scripts/update-backend-and-deploy.sh`.- Docs under root: `AUTOMATED_DEPLOY.md`, `DEPLOY_FUNCTIONS_GUIDE.md`, `MIGRATION_GUIDE.md`, `TESTING_GUIDE.md`.- `README.md` (project overview) and `SUPABASE_SECRETS_SETUP.md` (how-to for secrets).## Where to look for additional context (files to read)- Use Supabase Dashboard to configure edge function secrets (preferred for production).- Do NOT commit secrets to the repo. `env.local` contains placeholders and should be kept out of commits; never echo or return secret values in PRs.## Safety & secrets- 401 Unauthorized: check Auth usage; functions using anon keys expect JWTs or require service role; ensure header `Authorization: Bearer <key>` is present for internal calls.- 404/not found: function not deployed — run `supabase functions deploy <fn>` or `.\	ools\deploy` script and re-run.- 500 in functions: usually caused by missing environment variables or a function error — check function logs in Supabase dashboard and verify secrets (`OPENAI_API_KEY`, `SB_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `CRON_SECRET`).## Common errors and fixes (from repo docs)- Keep `audio_url` as `''` (empty string) if you remove audio generation to avoid NOT NULL DB constraint issues (see `publish-gist/index.ts`).- Use `zod` for request validation to keep consistent error messages and robust input checks.- When calling other functions from a function: use `fetch(${SUPABASE_URL}/functions/v1/<fn>, { headers: { Authorization: 'Bearer ' + dbKey, apikey: dbKey } })` and check the HTTP response for proper error handling.  3. Add the function name to `deploy-functions.ps1` and `verify-migration.js` as required for deployments and verification.  2. Add secrets to Supabase Dashboard → Edge Functions → Secrets (or update `scripts/update-backend-and-deploy.*`).  1. Add code under `supabase/functions/<name>/index.ts`.- When adding a new function:## Patterns to follow for changes- Browser quick-test: paste `test-function.js` into the console on the app and run; update env keys if needed.  - `supabase functions invoke publish-gist --body '{"topic":"AI news"}'`  - `supabase functions invoke generate-gist --body '{"topic":"Latest tech"}'`- Quick function invocation for testing:- Verify migrations: `node verify-migration.js` (requires `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`).o-script not present?` → use `.	oolsuild?` (instead, use repository scripts) — Example: `.\deploy-functions.ps1` (runs `supabase functions deploy publish-gist generate-gist text-to-speech`)elease