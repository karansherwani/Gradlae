# AGENTS.md

Project: **PACEMAKER / Gradlae** — an AI-powered academic-planning platform. Single Next.js 16 (App Router, React 19, Turbopack, React Compiler) app in TypeScript, backed by Supabase (auth, Postgres, storage) with optional LLM (Gemini/RouteLLM/OpenAI) and Stripe integrations.

Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`, `process-courses`) and setup is documented in `README.md`. Prefer those sources; the notes below only capture non-obvious, cloud-specific caveats.

## Cursor Cloud specific instructions

### Node version
- `package.json` requires Node **24.x**. Node 24 is installed via `nvm` and placed ahead of the default `/exec-daemon` Node (v22) in `~/.bashrc`, so login shells (including tmux terminals) resolve Node 24 automatically. Verify with `node --version` (expect `v24.x`). If you ever get v22, run `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"`.

### Environment variables / why the app 500s without them
- Every page imports `AuthProvider` → `app/lib/supabaseClient.ts`, which calls `createClient()` at module load. With no `NEXT_PUBLIC_SUPABASE_URL`, this throws `supabaseUrl is required` and **all pages return 500**.
- A gitignored `.env.local` with **placeholder** Supabase values is created so the dev server boots without secrets. This file is recreated by the startup update script if missing.
- Next.js/`@next/env` does **not** override variables already present in the real environment. So if you add **real** values via Cursor Secrets (env vars), those take precedence over the `.env.local` placeholders — no need to edit `.env.local`.

### What works without real secrets vs. what needs them
- Works on committed local data (no secrets): landing page, the **mentoring marketplace** (`/mentoring`, backed by `/api/mentors` + `app/data/*.json`), and the **course catalog API** (`/api/courses?q=...`, reads the ~11 MB `courses.csv`, ~17.8k courses).
- Requires **real Supabase** creds (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) + running `supabase/migration*.sql` on the project: signup/login (`/auth`), transcript upload, degree audit, degree planner (`/dashboard`, `/progress`), and any page that redirects to `/auth` when logged out.
- Requires an **LLM key** (`GEMINI_API_KEY` or `ROUTELLM_API_KEY` or `OPENAI_API_KEY`): AI advisor (`/api/advisor`) and quiz generation (`/api/generate-quiz`).
- Stripe (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`) and Google Analytics (`NEXT_PUBLIC_GA_ID`) are optional. `mongoose`/MongoDB code exists but is dead (unused by any route).

### Running / testing
- Dev server: `npm run dev` → http://localhost:3000 (Turbopack). Run it in a tmux terminal so logs stay visible.
- Lint: `npm run lint` (currently 0 errors, warnings only). There is **no automated test suite** (no `test` script / no jest/vitest config).
- The Python files at the repo root and in `scripts/` are **offline** data-scraping utilities used to regenerate `courses.csv`; they are not part of the runtime and have no declared dependency manifest.
