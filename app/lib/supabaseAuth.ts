// lib/supabaseAuth.ts
// Server-side helper to resolve the current Supabase user from a request.
// Used in API routes to authenticate and get the user's DB row.

import { supabaseAdmin } from './supabaseServer';

export interface PacemakerUser {
    id: string;       // users table PK
    authId: string;   // Supabase auth UID
    email: string;
    name: string;
    school: string;
    role: string;
}

/**
 * Given a Supabase access token (from the Authorization header),
 * return the pacemaker user row.  Creates the row on first login.
 */
export async function getAuthenticatedUser(accessToken: string): Promise<PacemakerUser | null> {
    if (!accessToken) return null;

    // Verify the JWT and get the Supabase auth user
    const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !authUser) {
        console.error('Auth verification failed:', error?.message);
        return null;
    }

    // Look up (or create) the users-table row
    const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

    if (existingUser) {
        return {
            id: existingUser.id,
            authId: existingUser.auth_id,
            email: existingUser.email,
            name: existingUser.name || '',
            school: existingUser.school || 'UArizona',
            role: existingUser.role || 'student',
        };
    }

    // First login → insert a user row
    const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
            auth_id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
            school: 'UArizona',
            role: 'student',
        })
        .select()
        .single();

    if (insertError || !newUser) {
        console.error('Failed to create user row:', insertError?.message);
        return null;
    }

    return {
        id: newUser.id,
        authId: newUser.auth_id,
        email: newUser.email,
        name: newUser.name || '',
        school: newUser.school || 'UArizona',
        role: newUser.role || 'student',
    };
}

/**
 * Shorthand: extract the bearer token from the request and resolve the user.
 */
export async function getUserFromRequest(request: Request): Promise<PacemakerUser | null> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    return getAuthenticatedUser(token);
}
