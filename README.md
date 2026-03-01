# PACEMAKER

An AI-powered academic planning platform built with Next.js. Deployed at [pacematch.vercel.app](https://pacematch.vercel.app).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supabase Setup

PACEMAKER uses **Supabase** for authentication, data storage, and file storage.

### 1. Create a Supabase Project

Go to [supabase.com](https://supabase.com) → create a project.

### 2. Set Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find these in: Supabase Dashboard → Project Settings → API.

For Vercel deployment, add the same variables in **Vercel → Project Settings → Environment Variables**.

### 3. Run the Database Migration

Open Supabase Dashboard → **SQL Editor** → **New query**, then paste the contents of:

```
supabase/migration.sql
```

Click **Run**. This creates all tables, RLS policies, and storage buckets.

### 4. Database Tables

| Table | Purpose |
|---|---|
| `users` | User profiles (linked to Supabase Auth) |
| `transcripts` | Parsed transcript data + raw file storage path |
| `planners` | Degree plan JSON (semesters, courses, notes) |
| `advisor_sessions` | AI advisor conversation logs |

### 5. Row-Level Security (RLS)

All tables have RLS enabled. Users can only read/write their own data. The `SUPABASE_SERVICE_ROLE_KEY` (used only server-side) bypasses RLS for trusted backend operations.

### 6. Storage

A private `transcripts` bucket stores uploaded PDF files, organized by user ID.

---

## Architecture

```
app/
  lib/
    supabaseClient.ts   ← browser client (anon key)
    supabaseServer.ts   ← server client (service role key)
    supabaseAuth.ts     ← server auth helper (JWT verification)
  api/
    auth/signup/         ← Supabase-based signup
    auth/signin/         ← Supabase-based signin
    transcript/upload/   ← PDF upload → Storage + parse → DB
    planner/             ← CRUD for degree planner
    advisor/             ← AI advisor (pulls from Supabase)
    user/data/           ← Data summary + delete all
  components/
    AuthProvider.tsx     ← Client auth context & useAuth() hook
  settings/              ← Account & data management page
```

---

## Other Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `ROUTELLM_API_KEY` | Yes | AI advisor LLM API key |
| `STRIPE_SECRET_KEY` | Optional | Payments |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | Optional | Payments (client) |

---

## Deploy on Vercel

Push to GitHub, link to Vercel, and add the env vars above. The app auto-deploys on push.
