// app/api/user/quiz-status/route.ts
// Check if user has attempted a quiz for a given course.
// Uses Supabase instead of JSON files.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

export async function GET(request: NextRequest) {
    const courseId = request.nextUrl.searchParams.get('courseId');

    if (!courseId) {
        return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
    }

    // Try Bearer auth first
    const user = await getUserFromRequest(request);

    if (!user) {
        // Fallback: check userId query param (legacy)
        const userEmail = request.nextUrl.searchParams.get('userId');
        if (!userEmail) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', userEmail.toLowerCase())
            .single();

        if (!userRow) {
            return NextResponse.json({ taken: false });
        }

        return checkQuizStatus(userRow.id, courseId);
    }

    return checkQuizStatus(user.id, courseId);
}

async function checkQuizStatus(userId: string, courseId: string) {
    const { data: attempt } = await supabaseAdmin
        .from('quiz_attempts')
        .select('id, score, total, percentage, created_at')
        .eq('user_id', userId)
        .eq('course_number', courseId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (attempt) {
        return NextResponse.json({
            taken: true,
            previousScore: attempt.score,
            totalQuestions: attempt.total,
            percentage: attempt.percentage,
            attemptDate: attempt.created_at,
        });
    }

    return NextResponse.json({ taken: false });
}

export async function POST(request: NextRequest) {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
