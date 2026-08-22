import { NextRequest, NextResponse } from 'next/server';
import { CourseGraph } from '@/app/lib/courseGraph';
import { findGraphCourseByCode, loadGraphCourses } from '@/app/lib/loadCourses';
import { normalizeCourseCode } from '@/app/lib/courseCodes';
import { transcriptCoursesToCompleted, type TranscriptCourseRow } from '@/app/lib/transcriptUtils';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        if (!code) {
            return NextResponse.json({ error: 'code query parameter is required' }, { status: 400 });
        }

        const normalized = normalizeCourseCode(code);
        if (!normalized) {
            return NextResponse.json({ error: 'Invalid course code format' }, { status: 400 });
        }

        const graph = new CourseGraph(loadGraphCourses());
        const course = findGraphCourseByCode(normalized);
        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        let completedCourses = [] as ReturnType<typeof transcriptCoursesToCompleted>;
        const completedParam = searchParams.get('completed');
        if (completedParam) {
            try {
                const parsed = JSON.parse(completedParam) as TranscriptCourseRow[];
                completedCourses = transcriptCoursesToCompleted(parsed);
            } catch {
                return NextResponse.json({ error: 'Invalid completed courses payload' }, { status: 400 });
            }
        }

        const check = graph.canTakeCourse(normalized, completedCourses);

        return NextResponse.json({
            courseId: course.id,
            title: course.title,
            units: course.units,
            eligible: check.eligible,
            missing: check.missing,
            missingDetails: check.missingDetails,
        });
    } catch (error) {
        console.error('Course eligibility error:', error);
        return NextResponse.json({ error: 'Failed to evaluate course eligibility' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const code = body.code as string | undefined;
        const transcript = (body.completedCourses || body.transcript || []) as TranscriptCourseRow[];

        if (!code) {
            return NextResponse.json({ error: 'code is required' }, { status: 400 });
        }

        const normalized = normalizeCourseCode(code);
        if (!normalized) {
            return NextResponse.json({ error: 'Invalid course code format' }, { status: 400 });
        }

        const graph = new CourseGraph(loadGraphCourses());
        const course = findGraphCourseByCode(normalized);
        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const completedCourses = transcriptCoursesToCompleted(transcript);
        const check = graph.canTakeCourse(normalized, completedCourses);

        return NextResponse.json({
            courseId: course.id,
            title: course.title,
            units: course.units,
            eligible: check.eligible,
            missing: check.missing,
            missingDetails: check.missingDetails,
        });
    } catch (error) {
        console.error('Course eligibility error:', error);
        return NextResponse.json({ error: 'Failed to evaluate course eligibility' }, { status: 500 });
    }
}
