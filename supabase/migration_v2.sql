-- =============================================================================
-- PACEMAKER – Supabase Schema Migration v2
-- =============================================================================
-- Run this in the Supabase SQL Editor AFTER the initial migration.
-- Adds: profiles, quiz_attempts, journal_entries, saved_courses tables
-- and extends the users table.
-- =============================================================================

-- ─── 1. EXTEND USERS TABLE ──────────────────────────────────────────────────
-- Add profile columns directly to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_id TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_picture TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';

-- ─── 2. QUIZ ATTEMPTS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    course_number   TEXT NOT NULL,
    course_name     TEXT DEFAULT '',
    score           INTEGER NOT NULL,
    total           INTEGER NOT NULL,
    percentage      INTEGER NOT NULL,
    questions_used  JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts"
    ON public.quiz_attempts FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own quiz attempts"
    ON public.quiz_attempts FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Service role can also insert (backend submission)
CREATE POLICY "Service role can insert quiz attempts"
    ON public.quiz_attempts FOR INSERT
    WITH CHECK (true);

-- ─── 3. JOURNAL ENTRIES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title           TEXT DEFAULT '',
    content         TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries"
    ON public.journal_entries FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own journal entries"
    ON public.journal_entries FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own journal entries"
    ON public.journal_entries FOR UPDATE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own journal entries"
    ON public.journal_entries FOR DELETE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Service role can manage journal entries
CREATE POLICY "Service role can manage journal entries"
    ON public.journal_entries FOR ALL
    WITH CHECK (true);

-- Auto-update updated_at on journal_entries
CREATE TRIGGER set_journal_entries_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ─── 4. SAVED COURSES (grade calculator) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    courses_json    JSONB DEFAULT '[]',
    notes           TEXT DEFAULT '',
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.saved_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved courses"
    ON public.saved_courses FOR SELECT
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert own saved courses"
    ON public.saved_courses FOR INSERT
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update own saved courses"
    ON public.saved_courses FOR UPDATE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete own saved courses"
    ON public.saved_courses FOR DELETE
    USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Service role
CREATE POLICY "Service role can manage saved courses"
    ON public.saved_courses FOR ALL
    WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER set_saved_courses_updated_at
    BEFORE UPDATE ON public.saved_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
