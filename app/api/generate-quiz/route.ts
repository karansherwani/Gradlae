import { NextRequest, NextResponse } from 'next/server';
import { generateQuizForCourse } from '@/app/lib/quizGenerator';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { generateQuizSchema, validateBody } from '@/app/lib/validation';

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Only Bearer token auth accepted. Legacy header fallback removed.
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = validateBody(generateQuizSchema, body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { courseNumber, courseName } = validation.data;

        // Check if user already attempted this quiz (using Supabase)
        const { data: attempt } = await supabaseAdmin
            .from('quiz_attempts')
            .select('id, score, total, percentage, created_at')
            .eq('user_id', user.id)
            .eq('course_number', courseNumber)
            .limit(1)
            .single();

        if (attempt) {
            return NextResponse.json(
                {
                    error: 'You have already completed this quiz',
                    previousScore: attempt.score,
                    totalQuestions: attempt.total,
                    percentage: attempt.percentage,
                    attemptDate: attempt.created_at,
                },
                { status: 403 },
            );
        }

        // Generate unique quiz
        const quiz = await generateQuizForCourse(
            user.id,
            courseNumber,
            courseName,
        );

        return NextResponse.json({
            success: true,
            quiz,
            generatedAt: new Date().toISOString(),
            note: 'Questions are unique to your user ID',
        });
    } catch (error) {
        console.error('Quiz API error:', error);
        // SECURITY: Don't leak internal error details to client
        return NextResponse.json(
            { error: 'Failed to generate quiz. Please try again.' },
            { status: 500 },
        );
    }
}

// SECURITY: Debug GET endpoint removed to prevent information leakage.