import { NextRequest, NextResponse } from 'next/server';
import { parseTranscriptPDF, StudentInfo } from '../../lib/pdfParser';
import connectToDatabase from '@/app/lib/mongodb';
import User from '@/app/models/User';

// Helper function for fuzzy name matching
function normalizeNameForComparison(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '') // Remove non-letters except spaces
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
}

function namesMatch(profileName: string, transcriptName: string): boolean {
    if (!profileName || !transcriptName) return false;

    const normalizedProfile = normalizeNameForComparison(profileName);
    const normalizedTranscript = normalizeNameForComparison(transcriptName);

    // Exact match
    if (normalizedProfile === normalizedTranscript) return true;

    // Check if all parts of profile name are in transcript name
    const profileParts = normalizedProfile.split(' ').filter(p => p.length > 1);
    const transcriptParts = normalizedTranscript.split(' ').filter(p => p.length > 1);

    // Check if first and last name match (allowing for middle names)
    if (profileParts.length >= 2 && transcriptParts.length >= 2) {
        const profileFirst = profileParts[0];
        const profileLast = profileParts[profileParts.length - 1];
        const transcriptFirst = transcriptParts[0];
        const transcriptLast = transcriptParts[transcriptParts.length - 1];

        if (profileFirst === transcriptFirst && profileLast === transcriptLast) {
            return true;
        }
    }

    // Check if at least two parts match
    let matchCount = 0;
    for (const part of profileParts) {
        if (transcriptParts.includes(part)) matchCount++;
    }

    return matchCount >= 2 || (matchCount >= 1 && profileParts.length === 1);
}

function normalizeDateForComparison(dateStr: string): string {
    if (!dateStr) return '';

    // Try to parse various date formats and normalize to YYYY-MM-DD
    const cleaned = dateStr.trim();

    // Format: MM/DD/YYYY or MM-DD-YYYY
    const usFormat = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (usFormat) {
        return `${usFormat[3]}-${usFormat[1].padStart(2, '0')}-${usFormat[2].padStart(2, '0')}`;
    }

    // Format: YYYY-MM-DD (already normalized)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
    }

    // Format: Month DD, YYYY
    const monthNames: Record<string, string> = {
        'jan': '01', 'january': '01',
        'feb': '02', 'february': '02',
        'mar': '03', 'march': '03',
        'apr': '04', 'april': '04',
        'may': '05',
        'jun': '06', 'june': '06',
        'jul': '07', 'july': '07',
        'aug': '08', 'august': '08',
        'sep': '09', 'september': '09',
        'oct': '10', 'october': '10',
        'nov': '11', 'november': '11',
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

    const normalizedProfile = normalizeDateForComparison(profileDate);
    const normalizedTranscript = normalizeDateForComparison(transcriptDate);

    return normalizedProfile === normalizedTranscript;
}

interface VerificationResult {
    verified: boolean;
    nameMatch: boolean;
    studentIdMatch: boolean;
    dobMatch: boolean;
    message: string;
    extractedInfo: StudentInfo;
}

function verifyTranscript(studentInfo: StudentInfo, profile: { fullName?: string; studentId?: string; dateOfBirth?: string }): VerificationResult {
    const nameMatch = studentInfo.name ? namesMatch(profile.fullName || '', studentInfo.name) : false;
    const studentIdMatch = studentInfo.studentId ? (profile.studentId === studentInfo.studentId) : false;
    const dobMatch = studentInfo.dateOfBirth ? datesMatch(profile.dateOfBirth || '', studentInfo.dateOfBirth) : false;

    // Verification passes if:
    // 1. Student ID matches (strongest identifier), OR
    // 2. Name matches AND DOB matches, OR
    // 3. Name matches and no DOB info in transcript
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

    return {
        verified,
        nameMatch,
        studentIdMatch,
        dobMatch,
        message,
        extractedInfo: studentInfo,
    };
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse transcript
        const transcript = await parseTranscriptPDF(buffer);

        // Initialize verification result
        let verification: VerificationResult | null = null;
        let savedToDatabase = false;

        // Verify and optionally save to MongoDB if userId is provided
        if (userId) {
            try {
                await connectToDatabase();

                // Get user profile for verification
                const user = await User.findOne({ email: userId.toLowerCase() });

                if (user && user.profile) {
                    // Verify transcript against profile
                    verification = verifyTranscript(transcript.studentInfo, {
                        fullName: user.profile.fullName,
                        studentId: user.profile.studentId,
                        dateOfBirth: user.profile.dateOfBirth,
                    });

                    console.log('Transcript verification result:', verification);

                    // Only save transcript if verification passes
                    if (verification.verified) {
                        // Transform courses to MongoDB format
                        const transcriptCourses = transcript.courses.map((c: { course: string; description?: string; grade: string; credits?: number; term?: string }) => ({
                            courseNumber: c.course,
                            courseName: c.description || '',
                            grade: c.grade,
                            credits: c.credits || 3,
                            term: c.term || 'Unknown',
                        }));

                        // Update or create user with transcript
                        await User.findOneAndUpdate(
                            { email: userId.toLowerCase() },
                            {
                                $set: { transcript: transcriptCourses },
                            },
                            { upsert: true, new: true }
                        );

                        savedToDatabase = true;
                        console.log(`✅ Transcript saved for user: ${userId}`);
                    } else {
                        console.log(`❌ Transcript NOT saved - verification failed for user: ${userId}`);
                    }
                }
            } catch (dbError) {
                console.error('Database error:', dbError);
                // Continue even if DB operation fails - still return parsed data
            }
        }

        return NextResponse.json({
            success: true,
            courses: transcript.courses,
            totalCourses: transcript.courses.length,
            savedToDatabase: savedToDatabase,
            verification: verification || {
                verified: false,
                message: 'No user profile found for verification. Please complete your profile first.',
                extractedInfo: transcript.studentInfo,
            },
        });

    } catch (error) {
        console.error('PDF parsing error:', error);
        return NextResponse.json(
            { error: 'Failed to process transcript: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

// GET - Retrieve saved transcript for a user
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const user = await User.findOne({ email: userId.toLowerCase() });

        if (!user || !user.transcript || user.transcript.length === 0) {
            return NextResponse.json({
                hasTranscript: false,
                courses: [],
            });
        }

        // Transform back to frontend format
        const courses = user.transcript.map((c: { courseNumber: string; courseName: string; grade: string; credits: number; term: string }) => ({
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
    } catch (error) {
        console.error('Transcript fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transcript' },
            { status: 500 }
        );
    }
}
