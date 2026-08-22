import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { ParsedTranscript } from '@/app/lib/transcriptTextParser';
import { profileHasVerificationData, verifyTranscript } from '@/app/lib/transcriptVerification';

export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { transcript } = await request.json() as { transcript?: ParsedTranscript };
        if (!transcript?.courses?.length) {
            return NextResponse.json({ error: 'No parsed transcript courses provided' }, { status: 400 });
        }

        const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('name, date_of_birth, student_id')
            .eq('id', user.id)
            .single();

        const verification = profileHasVerificationData(userRow)
            ? verifyTranscript(transcript.studentInfo, {
                fullName: userRow!.name,
                studentId: userRow!.student_id,
                dateOfBirth: userRow!.date_of_birth,
            })
            : {
                verified: true,
                nameMatch: false,
                studentIdMatch: false,
                dobMatch: false,
                message: 'Profile not completed — transcript accepted without verification.',
                extractedInfo: transcript.studentInfo,
            };

        if (!verification.verified) {
            return NextResponse.json({
                success: true,
                courses: transcript.courses,
                totalCourses: transcript.courses.length,
                savedToDatabase: false,
                verification,
            });
        }

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
            studentInfo: transcript.studentInfo || {},
            uploadedAt: new Date().toISOString(),
            parsedInBrowser: true,
        };

        const { data: existing } = await supabaseAdmin
            .from('transcripts')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (existing) {
            const { error } = await supabaseAdmin
                .from('transcripts')
                .update({ parsed_json: parsedJson })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabaseAdmin
                .from('transcripts')
                .insert({ user_id: user.id, parsed_json: parsedJson });
            if (error) throw error;
        }

        return NextResponse.json({
            success: true,
            courses: transcript.courses,
            totalCourses: transcript.courses.length,
            savedToDatabase: true,
            verification,
        });
    } catch (error) {
        console.error('Parsed transcript save error:', error);
        return NextResponse.json(
            { error: 'Failed to save parsed transcript: ' + (error as Error).message },
            { status: 500 },
        );
    }
}
