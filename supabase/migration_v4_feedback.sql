-- =============================================================================
-- PACEMAKER – Supabase Schema Migration v4 (Feedback storage)
-- =============================================================================
-- Run in Supabase SQL Editor after migration.sql + migration_v2/v3.
-- Stores product feedback / bug reports from /feedback.
-- Admins review rows in the Supabase Table Editor (no in-app admin UI yet).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    name        TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL,
    message     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'reviewed', 'archived')),
    user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON public.feedback (status);
CREATE INDEX IF NOT EXISTS feedback_type_idx ON public.feedback (type);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- No SELECT/UPDATE/DELETE policies for anon or authenticated clients.
-- Inserts go through the Next.js API using the service role (bypasses RLS).
-- Founders/admins read and triage in the Supabase dashboard.

COMMENT ON TABLE public.feedback IS 'Product feedback and bug reports from /feedback. Triage via status in the dashboard.';
COMMENT ON COLUMN public.feedback.status IS 'Triage: new | reviewed | archived';
COMMENT ON COLUMN public.feedback.user_id IS 'Optional link to public.users when the submitter chose to include their account';
