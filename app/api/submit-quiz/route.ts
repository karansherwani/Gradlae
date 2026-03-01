// app/api/submit-quiz/route.ts
// Saves quiz attempts to Supabase instead of JSON files.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { courseNumber, courseName, score, total, questionsUsed } = body;

        if (!courseNumber || score === undefined || total === undefined) {
            return NextResponse.json(
                { error: 'Missing required quiz data (courseNumber, score, total)' },
                { status: 400 },
            );
        }

        // Try Bearer auth first
        const user = await getUserFromRequest(request);

        if (!user) {
            // Fallback: check x-user-email header (legacy)
            const userEmail = request.headers.get('x-user-email');
            if (!userEmail) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // Look up user by email
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', userEmail.toLowerCase())
                .single();

            if (!userRow) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return saveQuizAttempt(userRow.id, courseNumber, courseName, score, total, questionsUsed);
        }

        return saveQuizAttempt(user.id, courseNumber, courseName, score, total, questionsUsed);
    } catch (error) {
        console.error('Quiz submission API error:', error);
        return NextResponse.json(
            { error: 'Failed to save quiz attempt', details: (error as Error).message },
            { status: 500 },
        );
    }
}

async function saveQuizAttempt(
    userId: string,
    courseNumber: string,
    courseName: string,
    score: number,
    total: number,
    questionsUsed: string[],
) {
    const percentage = Math.round((score / total) * 100);

    const { error } = await supabaseAdmin
        .from('quiz_attempts')
        .insert({
            user_id: userId,
            course_number: courseNumber,
            course_name: courseName || courseNumber,
            score,
            total,
            percentage,
            questions_used: questionsUsed || [],
        });

    if (error) {
        console.error('Supabase quiz insert error:', error.message);
        return NextResponse.json({ error: 'Failed to save quiz attempt' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Quiz attempt saved successfully' });
}
