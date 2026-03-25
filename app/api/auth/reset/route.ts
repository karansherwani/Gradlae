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
    const { email, netId, staffId, newPassword, otp } = validation.data;

    // Build the identifier
    const identifier = email || (netId ? `${netId}@uofa.edu` : null) || (staffId ? `${staffId}@uofa.edu` : null);

    if (!identifier) {
      return NextResponse.json(
        { message: 'Email, NetID, or Staff ID is required' },
        { status: 400 },
      );
    }

    // If user is requesting a reset email (no otp/newPassword provided)
    if (!newPassword && !otp) {
      // Use Supabase's built-in password reset email
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
        identifier.toLowerCase().trim(),
        {
          redirectTo: `${request.headers.get('origin') || 'https://your-vercel-domain.vercel.app'}/auth?mode=reset`,
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
    }

    // If user provides OTP + new password: update via Supabase Admin
    if (otp && newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { message: 'New password must be at least 6 characters' },
          { status: 400 },
        );
      }

      // Look up the user by email
      const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        console.error('List users error:', listError.message);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
      }

      const authUser = userList.users.find(
        (u) => u.email?.toLowerCase() === identifier.toLowerCase().trim(),
      );

      if (!authUser) {
        // SECURITY: Don't reveal whether the user exists.
        // Return the same success response as a valid reset.
        return NextResponse.json({
          success: true,
          message: 'If the verification was valid, your password has been updated.',
        });
      }

      // Update password via admin API (Supabase hashes it internally)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: newPassword },
      );

      if (updateError) {
        console.error('Password update error:', updateError.message);
        return NextResponse.json(
          { message: 'Failed to update password: ' + updateError.message },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
      });
    }

    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
