// app/api/upload/route.ts
// Transcript upload (POST) and retrieval (GET).
// Uses Supabase for storage instead of MongoDB.

import { NextRequest, NextResponse } from 'next/server';
import { parseTranscriptPDF, StudentInfo } from '../../lib/pdfParser';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

// Helper function for fuzzy name matching
function normalizeNameForComparison(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function namesMatch(profileName: string, transcriptName: string): boolean {
    if (!profileName || !transcriptName) return false;

    const normalizedProfile = normalizeNameForComparison(profileName);
    const normalizedTranscript = normalizeNameForComparison(transcriptName);

    if (normalizedProfile === normalizedTranscript) return true;

    const profileParts = normalizedProfile.split(' ').filter(p => p.length > 1);
    const transcriptParts = normalizedTranscript.split(' ').filter(p => p.length > 1);

    if (profileParts.length >= 2 && transcriptParts.length >= 2) {
        const profileFirst = profileParts[0];
        const profileLast = profileParts[profileParts.length - 1];
        const transcriptFirst = transcriptParts[0];
        const transcriptLast = transcriptParts[transcriptParts.length - 1];

        if (profileFirst === transcriptFirst && profileLast === transcriptLast) {
            return true;
        }
    }

    let matchCount = 0;
    for (const part of profileParts) {
        if (transcriptParts.includes(part)) matchCount++;
    }

    return matchCount >= 2 || (matchCount >= 1 && profileParts.length === 1);
}

function normalizeDateForComparison(dateStr: string): string {
    if (!dateStr) return '';
    const cleaned = dateStr.trim();

    const usFormat = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (usFormat) {
        return `${usFormat[3]}-${usFormat[1].padStart(2, '0')}-${usFormat[2].padStart(2, '0')}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

    const monthNames: Record<string, string> = {
        'jan': '01', 'january': '01', 'feb': '02', 'february': '02',
        'mar': '03', 'march': '03', 'apr': '04', 'april': '04',
        'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
        'aug': '08', 'august': '08', 'sep': '09', 'september': '09',
        'oct': '10', 'october': '10', 'nov': '11', 'november': '11',
        'dec': '12', 'december': '12',
    };

    const monthFormat = cleaned.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (monthFormat) {
        const month = monthNames[monthFormat[1].toLowerCase()];
        if (month) {
            return `${monthFormat[3]}-${month}-${monthFormat[2].padStart(2, '0')}`;
        }
    }

    return cleaned;
}

function datesMatch(profileDate: string, transcriptDate: string): boolean {
    if (!profileDate || !transcriptDate) return false;
    return normalizeDateForComparison(profileDate) === normalizeDateForComparison(transcriptDate);
}

interface VerificationResult {
    verified: boolean;
    nameMatch: boolean;
    studentIdMatch: boolean;
    dobMatch: boolean;
    message: string;
    extractedInfo: StudentInfo;
}

function verifyTranscript(
    studentInfo: StudentInfo,
    profile: { fullName?: string; studentId?: string; dateOfBirth?: string },
): VerificationResult {
    const nameMatch = studentInfo.name ? namesMatch(profile.fullName || '', studentInfo.name) : false;
    const studentIdMatch = studentInfo.studentId ? (profile.studentId === studentInfo.studentId) : false;
    const dobMatch = studentInfo.dateOfBirth ? datesMatch(profile.dateOfBirth || '', studentInfo.dateOfBirth) : false;

    const verified = studentIdMatch ||
        (nameMatch && dobMatch) ||
        (nameMatch && !studentInfo.dateOfBirth);

    let message = '';
    if (verified) {
        message = 'Transcript verified successfully.';
    } else {
        const issues: string[] = [];
        if (studentInfo.name && !nameMatch) issues.push('name does not match');
        if (studentInfo.studentId && !studentIdMatch) issues.push('student ID does not match');
        if (studentInfo.dateOfBirth && !dobMatch) issues.push('date of birth does not match');

        if (issues.length > 0) {
            message = `Warning: Transcript ${issues.join(', ')}. Please verify this is your transcript or update your profile.`;
        } else {
            message = 'Unable to verify transcript ownership. Limited information found in transcript.';
        }
    }

    return { verified, nameMatch, studentIdMatch, dobMatch, message, extractedInfo: studentInfo };
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Try to authenticate via Bearer token first
        const user = await getUserFromRequest(request);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse transcript
        const transcript = await parseTranscriptPDF(buffer);

        let verification: VerificationResult | null = null;
        let savedToDatabase = false;

        if (user) {
            // Get profile data for verification
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('name, date_of_birth, student_id')
                .eq('id', user.id)
                .single();

            const profileHasData = userRow && (
                (userRow.name && userRow.name.trim().length > 0) ||
                (userRow.student_id && userRow.student_id.trim().length > 0) ||
                (userRow.date_of_birth && userRow.date_of_birth.trim().length > 0)
            );

            if (profileHasData) {
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

            // Save transcript if verification passed
            if (verification.verified) {
                const parsedJson = {
                    courses: transcript.courses.map((c: { course: string; description?: string; grade: string; credits?: number; term?: string }) => ({
                        courseNumber: c.course,
                        courseName: c.description || '',
                        grade: c.grade,
                        credits: c.credits || 3,
                        term: c.term || 'Unknown',
                    })),
                    studentInfo: transcript.studentInfo,
                    uploadedAt: new Date().toISOString(),
                };

                // Check if user already has a transcript
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
                console.log(`Transcript saved to Supabase for user: ${user.email}`);
            }
        } else {
            verification = {
                verified: true,
                nameMatch: false,
                studentIdMatch: false,
                dobMatch: false,
                message: 'Not authenticated — transcript accepted without verification.',
                extractedInfo: transcript.studentInfo,
            };
        }

        return NextResponse.json({
            success: true,
            courses: transcript.courses,
            totalCourses: transcript.courses.length,
            savedToDatabase,
            verification,
        });
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
        // Try Bearer auth first
        const user = await getUserFromRequest(request);

        if (!user) {
            // Fallback: check query param (for legacy compatibility during migration)
            const userId = request.nextUrl.searchParams.get('userId');
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            // Look up user by email (legacy)
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', userId.toLowerCase())
                .single();

            if (!userRow) {
                return NextResponse.json({ hasTranscript: false, courses: [] });
            }

            return getTranscriptForUserId(userRow.id);
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
