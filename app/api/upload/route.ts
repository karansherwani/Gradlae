// app/api/upload/route.ts
// Transcript upload (POST) and retrieval (GET).
// Uses Supabase for storage instead of MongoDB.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { VerificationResult, profileHasVerificationData, verifyTranscript } from '@/app/lib/transcriptVerification';
import { ParsedTranscript } from '@/app/lib/transcriptTextParser';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function respondWithParsedTranscript(transcript: ParsedTranscript, request: NextRequest) {
    const user = await getUserFromRequest(request);
    let verification: VerificationResult | null = null;
    let savedToDatabase = false;

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('name, date_of_birth, student_id')
        .eq('id', user.id)
        .single();

    if (profileHasVerificationData(userRow)) {
        verification = verifyTranscript(transcript.studentInfo, {
            fullName: userRow!.name,
            studentId: userRow!.student_id,
            dateOfBirth: userRow!.date_of_birth,
        });
    } else {
        verification = {
            verified: true,
            nameMatch: false,
            studentIdMatch: false,
            dobMatch: false,
            message: 'Profile not completed — transcript accepted without verification.',
            extractedInfo: transcript.studentInfo,
        };
    }

    if (verification.verified) {
        const parsedJson = {
            courses: transcript.courses.map(c => ({
                courseNumber: c.course,
                courseName: c.description || '',
                grade: c.grade,
                credits: c.credits || 3,
                term: c.term || 'Unknown',
                isRetake: c.isRetake || false,
                originalGrade: c.originalGrade || null,
                originalTerm: c.originalTerm || null,
                allGrades: c.allGrades || null,
                bestGrade: c.bestGrade || c.grade,
                bestGradeTerm: c.bestGradeTerm || c.term,
            })),
            studentInfo: transcript.studentInfo,
            uploadedAt: new Date().toISOString(),
        };

        const { data: existing } = await supabaseAdmin
            .from('transcripts')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existing) {
            await supabaseAdmin
                .from('transcripts')
                .update({ parsed_json: parsedJson })
                .eq('id', existing.id);
        } else {
            await supabaseAdmin
                .from('transcripts')
                .insert({ user_id: user.id, parsed_json: parsedJson });
        }

        savedToDatabase = true;
        console.log('Transcript saved to Supabase');
    }

    return NextResponse.json({
        success: true,
        courses: transcript.courses,
        totalCourses: transcript.courses.length,
        savedToDatabase,
        verification,
    });
}

export async function POST(request: NextRequest) {
    try {
        if (request.headers.get('content-type')?.includes('application/json')) {
            const { transcript } = await request.json() as { transcript?: ParsedTranscript };
            if (!transcript?.courses?.length) {
                return NextResponse.json({ error: 'No parsed transcript courses provided' }, { status: 400 });
            }
            return respondWithParsedTranscript(transcript, request);
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        return NextResponse.json(
            {
                error: 'Server-side PDF parsing is disabled on Vercel. Parse the PDF in the browser and send parsed transcript JSON to this endpoint.',
            },
            { status: 415 },
        );
    } catch (error) {
        console.error('PDF parsing error:', error);
        return NextResponse.json(
            { error: 'Failed to process transcript: ' + (error as Error).message },
            { status: 500 },
        );
    }
}

// GET - Retrieve saved transcript for a user
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return getTranscriptForUserId(user.id);
    } catch (error) {
        console.error('Transcript fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
    }
}

async function getTranscriptForUserId(userId: string) {
    const { data: transcript } = await supabaseAdmin
        .from('transcripts')
        .select('parsed_json, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!transcript || !transcript.parsed_json?.courses?.length) {
        return NextResponse.json({ hasTranscript: false, courses: [] });
    }

    const courses = transcript.parsed_json.courses.map((c: { courseNumber: string; courseName: string; grade: string; credits: number; term: string }) => ({
        course: c.courseNumber,
        description: c.courseName,
        grade: c.grade,
        credits: c.credits,
        term: c.term,
    }));

    return NextResponse.json({
        hasTranscript: true,
        courses,
        totalCourses: courses.length,
    });
}
