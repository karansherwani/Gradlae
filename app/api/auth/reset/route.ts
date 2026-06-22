// app/api/auth/reset/route.ts
// Password reset — uses Supabase Auth's built-in password reset.
// SECURITY: Returns uniform responses to prevent user enumeration.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { resetSchema, validateBody } from '@/app/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateBody(resetSchema, body);
    if (!validation.success) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }
    const { email, netId, staffId } = validation.data;

    // Build the identifier
    const identifier = email || (netId ? `${netId}@uofa.edu` : null) || (staffId ? `${staffId}@uofa.edu` : null);

    if (!identifier) {
      return NextResponse.json(
        { message: 'Email, NetID, or Staff ID is required' },
        { status: 400 },
      );
    }

    // Use Supabase's built-in password reset email. Do not implement a custom
    // OTP/password update endpoint here; Supabase verifies the recovery token.
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      identifier.toLowerCase().trim(),
      {
        redirectTo: `${request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://gradlae.com'}/auth`,
      },
    );

    if (error) {
      console.error('Password reset email error:', error.message);
      // SECURITY: Don't reveal whether the email exists.
      // Fall through to the same generic response.
    }

    // SECURITY: Always return the same response regardless of whether
    // the email exists, to prevent user enumeration.
    return NextResponse.json({
      success: true,
      message: 'If that account exists, a password reset email has been sent.',
    });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
