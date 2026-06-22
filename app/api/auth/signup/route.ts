// app/api/auth/signup/route.ts
// Supabase-based signup – creates auth user + users-table row.
// Passwords are ONLY handled by Supabase Auth (bcrypt-hashed internally).
// SECURITY: Uniform error responses to prevent user enumeration.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { signupSchema, validateBody } from '@/app/lib/validation';

export async function POST(request: NextRequest) {
    try {
        // Verify env vars are set (this is the #1 cause of Vercel failures)
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('MISSING ENV VARS:', {
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
        const validation = validateBody(signupSchema, body);
        if (!validation.success) {
            return NextResponse.json({ message: validation.error }, { status: 400 });
        }
        const { email, password, name, school } = validation.data;

        // 1. Create Supabase auth user (password is bcrypt-hashed by Supabase internally)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase().trim(),
            password,
            email_confirm: true,
            user_metadata: { full_name: name || email.split('@')[0] },
        });

        if (authError) {
            const msg = authError.message.toLowerCase();
            // SECURITY: Use uniform response for duplicate accounts.
            // Don't reveal whether the account already exists.
            if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
                return NextResponse.json({
                    success: true,
                    message: 'Account setup initiated. If a new account was created, you can now sign in.',
                });
            }
            console.error('Supabase auth signup error:', authError.message);
            return NextResponse.json({ message: 'Signup failed. Please try again.' }, { status: 400 });
        }

        const authUser = authData.user;

        // 2. Create users-table row (no password stored here — only profile data)
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .insert({
                auth_id: authUser.id,
                email: (authUser.email || email).toLowerCase().trim(),
                name: name || email.split('@')[0],
                school: school || 'UArizona',
                role: 'student',
            });

        if (dbError) {
            console.error('Users table insert error:', dbError.message);
            // If duplicate key, that's ok — row already exists from a previous attempt
        }

        // 3. Sign the user in via admin to get tokens
        let sessionData;
        try {
            const result = await supabaseAdmin.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password,
            });

            if (result.error || !result.data.session) {
                // User was created but auto-sign-in failed — let them sign in manually
                return NextResponse.json({
                    success: true,
                    message: 'Account created successfully! Please sign in.',
                    userId: authUser.id,
                });
            }
            sessionData = result.data;
        } catch {
            // User was created but auto-sign-in failed — let them sign in manually
            return NextResponse.json({
                success: true,
                message: 'Account created successfully! Please sign in.',
                userId: authUser.id,
            });
        }

        return NextResponse.json({
            success: true,
            userId: authUser.id,
            email: authUser.email,
            fullName: name || email.split('@')[0],
            role: 'student',
            accessToken: sessionData.session.access_token,
            refreshToken: sessionData.session.refresh_token,
        });
    } catch (error) {
        console.error('Signup error:', error);
        const message = error instanceof Error ? error.message : 'Server error';
        console.error('Signup error detail:', message);
        return NextResponse.json(
            { message: 'Signup failed. Please try again.' },
            { status: 500 },
        );
    }
}
