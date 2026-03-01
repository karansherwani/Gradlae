// app/api/auth/reset/route.ts
// Password reset — uses Supabase Auth's built-in password reset.
// Sends a password reset email via Supabase; user clicks the link & sets new password.
// No plaintext passwords are stored or compared.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, netId, staffId, newPassword, otp } = body;

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
        return NextResponse.json(
          { message: 'Failed to send reset email. Please check your email address.' },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Password reset email sent! Check your inbox.',
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
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
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
