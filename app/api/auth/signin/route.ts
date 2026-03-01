// app/api/auth/signin/route.ts
// Supabase-based sign-in.
// Passwords are verified by Supabase Auth internally (bcrypt comparison).
// No plaintext passwords are stored or logged.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        // Sign in via Supabase Auth — password is verified against the bcrypt hash
        const { data: sessionData, error } = await supabaseAdmin.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password,
        });

        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
                return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
            }
            if (msg.includes('not confirmed') || msg.includes('email')) {
                return NextResponse.json({ message: 'Please confirm your email address first' }, { status: 401 });
            }
            console.error('Sign-in error:', error.message);
            return NextResponse.json({ message: 'Sign-in failed: ' + error.message }, { status: 400 });
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
        console.error('Signin error:', error);
        const message = error instanceof Error ? error.message : 'Server error';
        return NextResponse.json(
            { message: 'Sign-in failed: ' + message },
            { status: 500 },
        );
    }
}
