// app/api/auth/login/route.ts
// DEPRECATED — this route is kept for backward compatibility only.
// All new auth flows should use /api/auth/signin and /api/auth/signup.
// Redirects to the proper Supabase auth endpoints.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

  // Forward to the proper Supabase endpoint
  const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/signin';
  const origin = request.headers.get('origin') || request.nextUrl.origin;

  try {
    const response = await fetch(`${origin}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        password,
        name: body.fullName || userEmail.split('@')[0],
        school: university || 'UArizona',
        role: authMethod === 'staff' ? 'instructor' : 'student',
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json({ message: 'Server error. Please try again.' }, { status: 500 });
  }
}
