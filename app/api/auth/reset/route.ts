import { NextRequest, NextResponse } from 'next/server';
import { findUser, updateUserPassword } from '../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
   
    const { email, netId, staffId, newPassword, otp } = body;

    // Step 1: Request OTP (Mock)
    if (!newPassword && !otp) {
      
      const identifier = email || netId || staffId;
      
      if (!identifier) {
        return NextResponse.json(
          { message: 'Email, NetID, or Staff ID is required' },
          { status: 400 }
        );
      }

      const user = await findUser(identifier);

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

      
      const identifier = email || netId || staffId;

      if (!identifier) {
        return NextResponse.json(
          { message: 'Email, NetID, or Staff ID is required' },
          { status: 400 }
        );
      }

      const success = await updateUserPassword(identifier, newPassword);

      if (success) {
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
