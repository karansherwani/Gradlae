-- =============================================================================
-- PACEMAKER – FULL Supabase Schema (run this ONCE in Supabase SQL Editor)
-- =============================================================================
-- This combines the original migration + v2 extensions into one atomic script.
-- Safe to run: uses IF NOT EXISTS / IF NOT EXISTS / ON CONFLICT everywhere.
-- =============================================================================

-- 0. Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. USERS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id         UUID UNIQUE,
    email           TEXT UNIQUE NOT NULL,
    name            TEXT DEFAULT '',
    school          TEXT DEFAULT 'UArizona',
    date_of_birth   TEXT DEFAULT '',
    student_id      TEXT DEFAULT '',
    address         TEXT DEFAULT '',
    profile_picture TEXT DEFAULT '',
    role            TEXT DEFAULT 'student',
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Users can view own row') THEN
        CREATE POLICY "Users can view own row"
            ON public.users FOR SELECT
            USING (auth_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Users can update own row') THEN
        CREATE POLICY "Users can update own row"
            ON public.users FOR UPDATE
            USING (auth_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Service role can insert users') THEN
        CREATE POLICY "Service role can insert users"
            ON public.users FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- ─── 2. TRANSCRIPTS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transcripts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    raw_file_url    TEXT,
    parsed_json     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transcripts' AND policyname='Users can view own transcripts') THEN
        CREATE POLICY "Users can view own transcripts"
            ON public.transcripts FOR SELECT
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transcripts' AND policyname='Users can insert own transcripts') THEN
        CREATE POLICY "Users can insert own transcripts"
            ON public.transcripts FOR INSERT
            WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transcripts' AND policyname='Users can update own transcripts') THEN
        CREATE POLICY "Users can update own transcripts"
            ON public.transcripts FOR UPDATE
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transcripts' AND policyname='Users can delete own transcripts') THEN
        CREATE POLICY "Users can delete own transcripts"
            ON public.transcripts FOR DELETE
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

-- ─── 3. PLANNERS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.planners (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    planner_json    JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.planners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='planners' AND policyname='Users can view own planners') THEN
        CREATE POLICY "Users can view own planners"
            ON public.planners FOR SELECT
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='planners' AND policyname='Users can insert own planners') THEN
        CREATE POLICY "Users can insert own planners"
            ON public.planners FOR INSERT
            WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='planners' AND policyname='Users can update own planners') THEN
        CREATE POLICY "Users can update own planners"
            ON public.planners FOR UPDATE
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='planners' AND policyname='Users can delete own planners') THEN
        CREATE POLICY "Users can delete own planners"
            ON public.planners FOR DELETE
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

-- ─── 4. ADVISOR SESSIONS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    question    TEXT,
    answer      TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.advisor_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='advisor_sessions' AND policyname='Users can view own advisor sessions') THEN
        CREATE POLICY "Users can view own advisor sessions"
            ON public.advisor_sessions FOR SELECT
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='advisor_sessions' AND policyname='Users can insert own advisor sessions') THEN
        CREATE POLICY "Users can insert own advisor sessions"
            ON public.advisor_sessions FOR INSERT
            WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='advisor_sessions' AND policyname='Users can delete own advisor sessions') THEN
        CREATE POLICY "Users can delete own advisor sessions"
            ON public.advisor_sessions FOR DELETE
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

-- ─── 5. QUIZ ATTEMPTS ──────────────────────────────────────────────────────

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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quiz_attempts' AND policyname='Users can view own quiz attempts') THEN
        CREATE POLICY "Users can view own quiz attempts"
            ON public.quiz_attempts FOR SELECT
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quiz_attempts' AND policyname='Users can insert own quiz attempts') THEN
        CREATE POLICY "Users can insert own quiz attempts"
            ON public.quiz_attempts FOR INSERT
            WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quiz_attempts' AND policyname='Service role can insert quiz attempts') THEN
        CREATE POLICY "Service role can insert quiz attempts"
            ON public.quiz_attempts FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- ─── 6. JOURNAL ENTRIES ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title           TEXT DEFAULT '',
    content         TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journal_entries' AND policyname='Users can view own journal entries') THEN
        CREATE POLICY "Users can view own journal entries"
            ON public.journal_entries FOR SELECT
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journal_entries' AND policyname='Users can insert own journal entries') THEN
        CREATE POLICY "Users can insert own journal entries"
            ON public.journal_entries FOR INSERT
            WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journal_entries' AND policyname='Users can update own journal entries') THEN
        CREATE POLICY "Users can update own journal entries"
            ON public.journal_entries FOR UPDATE
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journal_entries' AND policyname='Users can delete own journal entries') THEN
        CREATE POLICY "Users can delete own journal entries"
            ON public.journal_entries FOR DELETE
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journal_entries' AND policyname='Service role can manage journal entries') THEN
        CREATE POLICY "Service role can manage journal entries"
            ON public.journal_entries FOR ALL
            WITH CHECK (true);
    END IF;
END $$;

-- ─── 7. SAVED COURSES (grade calculator) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_courses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    courses_json    JSONB DEFAULT '[]',
    notes           TEXT DEFAULT '',
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.saved_courses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_courses' AND policyname='Users can view own saved courses') THEN
        CREATE POLICY "Users can view own saved courses"
            ON public.saved_courses FOR SELECT
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_courses' AND policyname='Users can insert own saved courses') THEN
        CREATE POLICY "Users can insert own saved courses"
            ON public.saved_courses FOR INSERT
            WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_courses' AND policyname='Users can update own saved courses') THEN
        CREATE POLICY "Users can update own saved courses"
            ON public.saved_courses FOR UPDATE
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_courses' AND policyname='Users can delete own saved courses') THEN
        CREATE POLICY "Users can delete own saved courses"
            ON public.saved_courses FOR DELETE
            USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_courses' AND policyname='Service role can manage saved courses') THEN
        CREATE POLICY "Service role can manage saved courses"
            ON public.saved_courses FOR ALL
            WITH CHECK (true);
    END IF;
END $$;

-- ─── 8. STORAGE BUCKET ──────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('transcripts', 'transcripts', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users can upload own transcripts') THEN
        CREATE POLICY "Users can upload own transcripts"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'transcripts'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users can view own transcript files') THEN
        CREATE POLICY "Users can view own transcript files"
            ON storage.objects FOR SELECT
            USING (
                bucket_id = 'transcripts'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Users can delete own transcript files') THEN
        CREATE POLICY "Users can delete own transcript files"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'transcripts'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;

-- ─── 9. HELPER: auto-update updated_at triggers ─────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Planners trigger
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_planners_updated_at') THEN
        CREATE TRIGGER set_planners_updated_at
            BEFORE UPDATE ON public.planners
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- Journal entries trigger
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_journal_entries_updated_at') THEN
        CREATE TRIGGER set_journal_entries_updated_at
            BEFORE UPDATE ON public.journal_entries
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- Saved courses trigger
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_saved_courses_updated_at') THEN
        CREATE TRIGGER set_saved_courses_updated_at
            BEFORE UPDATE ON public.saved_courses
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;
