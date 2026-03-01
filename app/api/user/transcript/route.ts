// app/api/user/transcript/route.ts
// Fetch saved transcript from Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

export async function GET(request: NextRequest) {
    try {
        // Try Bearer auth
        const user = await getUserFromRequest(request);

        if (!user) {
            // Fallback: header (legacy)
            const userId = request.headers.get('x-user-id');
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', userId.toLowerCase())
                .single();

            if (!userRow) {
                return NextResponse.json({ courses: [] });
            }

            return getTranscriptCourses(userRow.id);
        }

        return getTranscriptCourses(user.id);
    } catch (error) {
        console.error('Error fetching transcript:', error);
        return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
    }
}

async function getTranscriptCourses(userId: string) {
    const { data: transcript } = await supabaseAdmin
        .from('transcripts')
        .select('parsed_json')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (!transcript || !transcript.parsed_json?.courses) {
        return NextResponse.json({ courses: [] });
    }

    const courses = transcript.parsed_json.courses.map((c: { courseNumber: string; courseName: string; grade: string; credits: number; term: string }) => ({
        course: c.courseNumber,
        description: c.courseName,
        grade: c.grade,
        credits: c.credits,
        term: c.term,
    }));

    return NextResponse.json({ courses });
}
