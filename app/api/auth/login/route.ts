import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/app/lib/mongodb';
import User from '@/app/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { university, authMethod, email, netId, staffId, password } = body;

    // Validate required fields
    if (!password) {
      return NextResponse.json(
        { message: 'Password is required' },
        { status: 400 }
      );
    }

    if (authMethod === 'email' && !email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    if (authMethod === 'netid' && !netId) {
      return NextResponse.json(
        { message: 'NetID is required' },
        { status: 400 }
      );
    }

    if (authMethod === 'staff' && !staffId) {
      return NextResponse.json(
        { message: 'Staff ID is required' },
        { status: 400 }
      );
    }

    // Build an email-like identifier for MongoDB (the User model uses email as the unique key)
    let userEmail: string;
    if (authMethod === 'email') {
      userEmail = email.toLowerCase().trim();
    } else if (authMethod === 'netid') {
      userEmail = `${netId.toLowerCase().trim()}@${university || 'uofa'}.edu`;
    } else if (authMethod === 'staff') {
      userEmail = `${staffId.toLowerCase().trim()}@${university || 'uofa'}.edu`;
    } else {
      return NextResponse.json(
        { message: 'Invalid authentication method' },
        { status: 400 }
      );
    }

    const isSignup = body.isSignup;

    // Connect to MongoDB
    await connectToDatabase();

    if (isSignup) {
      // ─── SIGN UP ─────────────────────────────────────────────────────
      const existingUser = await User.findOne({ email: userEmail });
      if (existingUser) {
        return NextResponse.json({ message: 'User already exists' }, { status: 409 });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Build name
      let fullName: string;
      if (authMethod === 'email') {
        fullName = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
      } else if (authMethod === 'netid') {
        fullName = netId.charAt(0).toUpperCase() + netId.slice(1);
      } else {
        fullName = `Prof. ${staffId.charAt(0).toUpperCase() + staffId.slice(1)}`;
      }

      const studentId = authMethod === 'staff' ? '' : 'A00' + Math.random().toString().slice(2, 8);
      const staffIdGenerated = authMethod === 'staff' ? 'STAFF_' + Math.random().toString().slice(2, 8) : '';
      const role = authMethod === 'staff' ? 'instructor' : 'student';

      const newUser = await User.create({
        email: userEmail,
        password: hashedPassword,
        authProvider: 'credentials',
        profile: {
          fullName,
          studentId,
        },
      });

      return NextResponse.json({
        success: true,
        token: 'auth_token_' + Date.now(),
        userId: newUser._id.toString(),
        fullName,
        email: userEmail,
        studentId,
        staffId: staffIdGenerated || undefined,
        role,
        classes: authMethod === 'staff'
          ? ['CS101', 'CS202']
          : [],
        grades: authMethod === 'staff' ? {} : [],
      }, { status: 200 });

    } else {
      // ─── SIGN IN ─────────────────────────────────────────────────────
      const user = await User.findOne({ email: userEmail });

      if (!user) {
        return NextResponse.json({ message: 'User not found. Please sign up first.' }, { status: 404 });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password || '');
      if (!isValid) {
        return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
      }

      const fullName = user.profile?.fullName || userEmail.split('@')[0];
      const role = authMethod === 'staff' ? 'instructor' : 'student';

      return NextResponse.json({
        success: true,
        token: 'auth_token_' + Date.now(),
        userId: user._id.toString(),
        fullName,
        email: userEmail,
        studentId: user.profile?.studentId || '',
        role,
        classes: authMethod === 'staff' || role === 'instructor'
          ? [
            { code: 'CS 101', name: 'Intro to Programming', credits: 3, section: 'A', enrolled: 45 },
            { code: 'CS 202', name: 'Data Structures', credits: 4, section: 'B', enrolled: 38 }
          ]
          : [],
        grades: authMethod === 'staff' || role === 'instructor'
          ? {}
          : [],
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
