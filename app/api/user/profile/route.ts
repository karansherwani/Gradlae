// app/api/user/profile/route.ts
// Profile CRUD — uses Supabase users table (extended with profile columns).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

// GET - Retrieve user profile
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: row } = await supabaseAdmin
            .from('users')
            .select('name, date_of_birth, student_id, address, profile_picture, major, degree_plan_id')
            .eq('id', user.id)
            .single();

        return NextResponse.json({
            fullName: row?.name || '',
            dateOfBirth: row?.date_of_birth || '',
            studentId: row?.student_id || '',
            address: row?.address || '',
            profilePicture: row?.profile_picture || '',
            major: row?.major || '',
            degreePlanId: row?.degree_plan_id || 'bs-cse-2025-26',
        });
    } catch (error) {
        console.error('Profile GET error:', error);
        return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
    }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fullName, dateOfBirth, studentId, address, profilePicture, major, degreePlanId } = await request.json();

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                name: fullName || '',
                date_of_birth: dateOfBirth || '',
                student_id: studentId || '',
                address: address || '',
                profile_picture: profilePicture || '',
                major: major || '',
                degree_plan_id: degreePlanId || 'bs-cse-2025-26',
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Profile update error:', updateError.message);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            profile: { fullName, dateOfBirth, studentId, address, profilePicture, major, degreePlanId },
        });
    } catch (error) {
        console.error('Profile PUT error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
