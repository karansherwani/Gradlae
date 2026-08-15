-- =============================================================================
-- PACEMAKER – Supabase Schema Migration v3 (Degree planning)
-- =============================================================================
-- Run in Supabase SQL Editor after migration.sql + migration_v2.sql
-- =============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS major TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS degree_plan_id TEXT DEFAULT 'bs-cse-2025-26';
