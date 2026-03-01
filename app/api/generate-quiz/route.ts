import { NextRequest, NextResponse } from 'next/server';
import { generateQuizForCourse } from '@/app/lib/quizGenerator';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

export async function POST(request: NextRequest) {
    try {
        const { courseNumber, courseName } = await request.json();

        // Try Bearer auth first
        const user = await getUserFromRequest(request);
        let userId: string;

        if (user) {
            userId = user.id;
        } else {
            // Fallback: x-user-email header (legacy)
            const userEmail = request.headers.get('x-user-email');
            if (!userEmail) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', userEmail.toLowerCase())
                .single();

            if (!userRow) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
            userId = userRow.id;
        }

        if (!courseNumber || !courseName) {
            return NextResponse.json(
                { error: 'Missing required fields: courseNumber, courseName' },
                { status: 400 },
            );
        }

        // Check if user already attempted this quiz (using Supabase)
        const { data: attempt } = await supabaseAdmin
            .from('quiz_attempts')
            .select('id, score, total, percentage, created_at')
            .eq('user_id', userId)
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
            userId,
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
        let errorMessage = (error as Error).message;

        if (errorMessage.includes('API key not valid')) {
            errorMessage = 'System Configuration Error: Invalid API Key. Please check server logs.';
        }

        return NextResponse.json(
            { error: 'Failed to generate quiz', details: errorMessage },
            { status: 500 },
        );
    }
}

// GET method for debugging
export async function GET() {
    return NextResponse.json({
        status: 'active',
        message: 'Quiz generation API is running',
        note: 'Use POST method with courseNumber, courseName',
    });
}