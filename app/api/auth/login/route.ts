// app/api/auth/login/route.ts
// DEPRECATED — this route is kept for backward compatibility only.
// All new auth flows should use /api/auth/signin and /api/auth/signup.
// Now calls Supabase directly instead of proxying via HTTP fetch
// to avoid "fetch failed" errors on Vercel.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    // Verify env vars are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[login/route] MISSING ENV VARS:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      });
      return NextResponse.json(
        { message: 'Server configuration error. Please contact support.' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { isSignup, email, password, authMethod, netId, staffId, university } = body;

    // Build the proper email for Supabase
    let userEmail: string;
    if (authMethod === 'email') {
      userEmail = email?.toLowerCase().trim();
    } else if (authMethod === 'netid') {
      userEmail = `${(netId || '').toLowerCase().trim()}@${university || 'uofa'}.edu`;
    } else if (authMethod === 'staff') {
      userEmail = `${(staffId || '').toLowerCase().trim()}@${university || 'uofa'}.edu`;
    } else {
      userEmail = email?.toLowerCase().trim();
    }

    if (!userEmail || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const name = body.fullName || userEmail.split('@')[0];
    const school = university || 'UArizona';
    const role = authMethod === 'staff' ? 'instructor' : 'student';

    if (isSignup) {
      // ── Sign Up ──
      if (password.length < 6) {
        return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
          return NextResponse.json({ message: 'An account with this email already exists' }, { status: 409 });
        }
        console.error('[login/route] Supabase signup error:', authError.message);
        return NextResponse.json({ message: 'Signup failed: ' + authError.message }, { status: 400 });
      }

      const authUser = authData.user;

      // Create users-table row
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_id: authUser.id,
          email: userEmail,
          name,
          school,
          role,
        });

      if (dbError) {
        console.error('[login/route] Users table insert error:', dbError.message);
      }

      // Auto sign-in
      let sessionData;
      try {
        const result = await supabaseAdmin.auth.signInWithPassword({
          email: userEmail,
          password,
        });
        if (result.error || !result.data.session) {
          return NextResponse.json({
            success: true,
            message: 'Account created successfully! Please sign in.',
            userId: authUser.id,
          });
        }
        sessionData = result.data;
      } catch {
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
        fullName: name,
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
      });
    } else {
      // ── Sign In ──
      let sessionData;
      try {
        const result = await supabaseAdmin.auth.signInWithPassword({
          email: userEmail,
          password,
        });

        if (result.error) {
          const msg = result.error.message.toLowerCase();
          if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
            return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
          }
          console.error('[login/route] Sign-in error:', result.error.message);
          return NextResponse.json({ message: 'Sign-in failed. Please try again.' }, { status: 400 });
        }

        if (!result.data.session) {
          return NextResponse.json({ message: 'Sign-in failed — no session created' }, { status: 401 });
        }
        sessionData = result.data;
      } catch (fetchErr) {
        console.error('[login/route] Supabase fetch error:', fetchErr);
        return NextResponse.json(
          { message: 'Unable to reach authentication service. Please try again later.' },
          { status: 502 },
        );
      }

      // Fetch user row
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('auth_id', sessionData.user.id)
        .single();

      if (!userRow) {
        await supabaseAdmin.from('users').insert({
          auth_id: sessionData.user.id,
          email: userEmail,
          name: sessionData.user.user_metadata?.full_name || userEmail.split('@')[0],
          school,
          role,
        });
      }

      return NextResponse.json({
        success: true,
        userId: sessionData.user.id,
        email: sessionData.user.email,
        fullName: userRow?.name || sessionData.user.user_metadata?.full_name || userEmail.split('@')[0],
        school: userRow?.school || school,
        dbUserId: userRow?.id || null,
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
      });
    }
  } catch (error) {
    console.error('[login/route] Unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json(
      { message: 'Login failed: ' + message },
      { status: 500 },
    );
  }
}
