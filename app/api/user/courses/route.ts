// app/api/user/courses/route.ts
// Saved courses for grade calculator — uses Supabase instead of MongoDB.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

// GET - Retrieve user's saved courses for grade calculator
export async function GET(request: NextRequest) {
    try {
        // Try Bearer auth
        const user = await getUserFromRequest(request);

        if (!user) {
            // Fallback: query param (legacy)
            const userId = request.nextUrl.searchParams.get('userId');
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', userId.toLowerCase())
                .single();

            if (!userRow) return NextResponse.json({ courses: [] });
            return getCoursesForUser(userRow.id);
        }

        return getCoursesForUser(user.id);
    } catch (error) {
        console.error('Courses GET error:', error);
        return NextResponse.json({ error: 'Failed to retrieve courses' }, { status: 500 });
    }
}

// PUT - Save user's courses for grade calculator
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { courses } = body;

        // Try Bearer auth
        const user = await getUserFromRequest(request);

        if (!user) {
            // Fallback: userId in body (legacy)
            const userId = body.userId;
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', userId.toLowerCase())
                .single();

            if (!userRow) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return saveCoursesForUser(userRow.id, courses);
        }

        return saveCoursesForUser(user.id, courses);
    } catch (error) {
        console.error('Courses PUT error:', error);
        return NextResponse.json({ error: 'Failed to save courses' }, { status: 500 });
    }
}

async function getCoursesForUser(userId: string) {
    const { data: row } = await supabaseAdmin
        .from('saved_courses')
        .select('courses_json')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    return NextResponse.json({ courses: row?.courses_json || [] });
}

async function saveCoursesForUser(userId: string, courses: unknown[]) {
    // Upsert: check if row exists
    const { data: existing } = await supabaseAdmin
        .from('saved_courses')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single();

    if (existing) {
        await supabaseAdmin
            .from('saved_courses')
            .update({ courses_json: courses || [] })
            .eq('id', existing.id);
    } else {
        await supabaseAdmin
            .from('saved_courses')
            .insert({ user_id: userId, courses_json: courses || [] });
    }

    return NextResponse.json({ success: true });
}
