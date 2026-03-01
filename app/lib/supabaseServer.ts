// lib/supabaseServer.ts
// Server-side Supabase client – uses the SERVICE ROLE key.
// ⚠️  NEVER import this file in client components or expose the key.
// Use only inside API routes, server actions, or server components.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
    if (_supabaseAdmin) return _supabaseAdmin;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
            'Missing Supabase server env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        );
    }

    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    return _supabaseAdmin;
}

// Lazy getter – only throws when actually called at runtime, not at import time.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        const admin = getSupabaseAdmin();
        return (admin as unknown as Record<string | symbol, unknown>)[prop];
    },
});
