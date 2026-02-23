import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import User from '@/app/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, netId, staffId, newPassword, otp } = body;

    // Build email identifier (same logic as login route)
    const identifier = email || (netId ? `${netId.toLowerCase().trim()}@uofa.edu` : null) || (staffId ? `${staffId.toLowerCase().trim()}@uofa.edu` : null);

    if (!identifier) {
      return NextResponse.json(
        { message: 'Email, NetID, or Staff ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Step 1: Request OTP (Mock)
    if (!newPassword && !otp) {
      const user = await User.findOne({ email: identifier.toLowerCase() });

      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      // Mock sending email
      console.log(`[MOCK EMAIL] OTP for ${identifier} is 123456`);

      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email (Check console: 123456)'
      });
    }

    // Step 2: Reset Password
    if (otp && newPassword) {
      if (otp !== '123456') { // Fixed mock OTP
        return NextResponse.json({ message: 'Invalid OTP' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      const result = await User.findOneAndUpdate(
        { email: identifier.toLowerCase() },
        { $set: { password: hashedPassword } }
      );

      if (result) {
        return NextResponse.json({
          success: true,
          message: 'Password updated successfully'
        });
      } else {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}
