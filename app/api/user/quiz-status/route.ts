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

    const user = await getUserFromRequest(request);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

export async function POST() {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
