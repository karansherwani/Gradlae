import { NextRequest, NextResponse } from 'next/server';
import { findUser, saveUser } from '../../../lib/db';

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

    
    const identifier = authMethod === 'email' 
      ? email 
      : authMethod === 'netid' 
        ? netId 
        : staffId;

    const isSignup = body.isSignup;

    if (isSignup) {
      if (await findUser(identifier)) {
        return NextResponse.json({ message: 'User already exists' }, { status: 409 });
      }

      
      let fullName: string;
      let userEmail: string;

      if (authMethod === 'email') {
        fullName = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
        userEmail = email;
      } else if (authMethod === 'netid') {
        fullName = netId.charAt(0).toUpperCase() + netId.slice(1);
        userEmail = `${netId}@${university}.edu`;
      } else if (authMethod === 'staff') {
        fullName = `Prof. ${staffId.charAt(0).toUpperCase() + staffId.slice(1)}`;
        userEmail = `${staffId}@${university}.edu`;
      } else {
        return NextResponse.json(
          { message: 'Invalid authentication method' },
          { status: 400 }
        );
      }

      const newUser = {
        id: Date.now().toString(),
        authMethod,
        identifier,
        password, // In prod, hash this
        fullName: fullName,
        studentId: authMethod === 'staff' ? undefined : 'A00' + Math.random().toString().slice(2, 8),
        staffId: authMethod === 'staff' ? 'STAFF_' + Math.random().toString().slice(2, 8) : undefined,
        role: authMethod === 'staff' ? 'instructor' : 'student',
      };

      await saveUser(newUser);

      // Return successful session immediately after signup
      return NextResponse.json({
        success: true,
        token: 'auth_token_' + Date.now(),
        userId: newUser.id,
        fullName: newUser.fullName,
        email: userEmail,
        studentId: newUser.studentId,
        staffId: newUser.staffId,
        role: newUser.role,
        classes: authMethod === 'staff' 
          ? ['CS101', 'CS202']  // Classes they teach
          : [],  // Empty for new students
        grades: authMethod === 'staff' ? {} : [],
      }, { status: 200 });

    } else {
      // Sign In
      const user = await findUser(identifier);

      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      if (user.password !== password) {
        return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
      }

      // ✅ BUILD email based on auth method
      const userEmail = user.authMethod === 'email' 
        ? user.identifier 
        : `${user.identifier}@${university}.edu`;

      return NextResponse.json({
        success: true,
        token: 'auth_token_' + Date.now(),
        userId: user.id,
        fullName: user.fullName,
        email: userEmail,
        studentId: user.studentId,
        staffId: user.staffId,
        role: user.role || (user.authMethod === 'staff' ? 'instructor' : 'student'),
        
        classes: user.authMethod === 'staff' || user.role === 'instructor'
          ? [
              { code: 'CS 101', name: 'Intro to Programming', credits: 3, section: 'A', enrolled: 45 },
              { code: 'CS 202', name: 'Data Structures', credits: 4, section: 'B', enrolled: 38 }
            ]
          : [
              { code: 'MATH 201', name: 'Calculus II', credits: 4, grade: 'A-', professor: 'Dr. Sarah Chen' },
              { code: 'PHYS 151', name: 'Physics I', credits: 4, grade: 'B+', professor: 'Prof. John Williams' }
            ],
        grades: user.authMethod === 'staff' || user.role === 'instructor'
          ? {}  // Staff don't have grades
          : [
              { courseCode: 'MATH 201', grade: 'A-' },
              { courseCode: 'PHYS 151', grade: 'B+' }
            ],
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
