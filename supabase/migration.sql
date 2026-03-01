-- =============================================================================
-- PACEMAKER – Supabase Schema Migration
-- =============================================================================
-- Run this entire file in the Supabase SQL Editor (Dashboard → SQL → New query).
-- It creates the tables, enables RLS, and sets up access policies.
-- =============================================================================

-- 0. Enable UUID generation (should already be enabled, but just in case)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. USERS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id     UUID UNIQUE,        -- maps to Supabase auth.users.id
    email       TEXT UNIQUE NOT NULL,
    name        TEXT DEFAULT '',
    school      TEXT DEFAULT 'UArizona',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Users table: allow authenticated users to read/update their own row.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own row"
    ON public.users FOR SELECT
    USING (auth_id = auth.uid());

CREATE POLICY "Users can update own row"
    ON public.users FOR UPDATE
    USING (auth_id = auth.uid());

-- Insert is handled by the service role (backend) after signup.
CREATE POLICY "Service role can insert users"
    ON public.users FOR INSERT
    WITH CHECK (true);

-- ─── 2. TRANSCRIPTS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transcripts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    raw_file_url    TEXT,               -- Supabase Storage path
    parsed_json     JSONB DEFAULT '{}', -- structured transcript data
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transcripts"
    ON public.transcripts FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own transcripts"
    ON public.transcripts FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own transcripts"
    ON public.transcripts FOR UPDATE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own transcripts"
    ON public.transcripts FOR DELETE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- ─── 3. PLANNERS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.planners (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    planner_json    JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.planners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own planners"
    ON public.planners FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own planners"
    ON public.planners FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own planners"
    ON public.planners FOR UPDATE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own planners"
    ON public.planners FOR DELETE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- ─── 4. ADVISOR SESSIONS (optional logging) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    question    TEXT,
    answer      TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.advisor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own advisor sessions"
    ON public.advisor_sessions FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own advisor sessions"
    ON public.advisor_sessions FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own advisor sessions"
    ON public.advisor_sessions FOR DELETE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- ─── 5. STORAGE BUCKET ──────────────────────────────────────────────────────
-- Create a private bucket for transcript PDFs.
-- Run this in the SQL editor or create via the Dashboard → Storage.

INSERT INTO storage.buckets (id, name, public)
VALUES ('transcripts', 'transcripts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: users can upload to their own folder
CREATE POLICY "Users can upload own transcripts"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'transcripts'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view own transcript files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'transcripts'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete own transcript files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'transcripts'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ─── 6. HELPER: auto-update updated_at on planners ─────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_planners_updated_at
    BEFORE UPDATE ON public.planners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
