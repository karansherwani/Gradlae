// app/api/auth/signin/route.ts
// Supabase-based sign-in.
// Passwords are verified by Supabase Auth internally (bcrypt comparison).
// No plaintext passwords are stored or logged.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { signinSchema, validateBody } from '@/app/lib/validation';

export async function POST(request: NextRequest) {
    try {
        // Verify env vars are set (this is the #1 cause of Vercel failures)
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[signin/route] MISSING ENV VARS:', {
                hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            });
            return NextResponse.json(
                { message: 'Server configuration error. Please contact support.' },
                { status: 500 },
            );
        }

        const body = await request.json();
        const validation = validateBody(signinSchema, body);
        if (!validation.success) {
            return NextResponse.json({ message: validation.error }, { status: 400 });
        }
        const { email, password } = validation.data;

        // Sign in via Supabase Auth — password is verified against the bcrypt hash
        let sessionData;
        try {
            const result = await supabaseAdmin.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password,
            });

            if (result.error) {
                const msg = result.error.message.toLowerCase();
                if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
                    return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
                }
                if (msg.includes('not confirmed') || msg.includes('email')) {
                    return NextResponse.json({ message: 'Please confirm your email address first' }, { status: 401 });
                }
                console.error('[signin/route] Sign-in error:', result.error.message);
                return NextResponse.json({ message: 'Sign-in failed. Please try again.' }, { status: 400 });
            }

            sessionData = result.data;
        } catch (fetchErr) {
            console.error('[signin/route] Supabase fetch error:', fetchErr);
            console.error('[signin/route] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
            console.error('[signin/route] Service key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
            return NextResponse.json(
                { message: 'Unable to reach authentication service. Please try again later.' },
                { status: 502 },
            );
        }

        if (!sessionData.session) {
            return NextResponse.json({ message: 'Sign-in failed — no session created' }, { status: 401 });
        }

        // Fetch user row from the users table
        const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('auth_id', sessionData.user.id)
            .single();

        // If no user row exists yet (e.g. user created before migration), create one
        if (!userRow) {
            await supabaseAdmin.from('users').insert({
                auth_id: sessionData.user.id,
                email: (sessionData.user.email || email).toLowerCase().trim(),
                name: sessionData.user.user_metadata?.full_name || email.split('@')[0],
                school: 'UArizona',
                role: 'student',
            });
        }

        return NextResponse.json({
            success: true,
            userId: sessionData.user.id,
            email: sessionData.user.email,
            fullName: userRow?.name || sessionData.user.user_metadata?.full_name || email.split('@')[0],
            school: userRow?.school || 'UArizona',
            dbUserId: userRow?.id || null,
            accessToken: sessionData.session.access_token,
            refreshToken: sessionData.session.refresh_token,
        });
    } catch (error) {
        console.error('[signin/route] Unhandled error:', error);
        const message = error instanceof Error ? error.message : 'Server error';
        return NextResponse.json(
            { message: 'Sign-in failed: ' + message },
            { status: 500 },
        );
    }
}
