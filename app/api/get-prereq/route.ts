import { NextResponse } from 'next/server';
import { findCourseByCode } from '@/app/lib/loadCourses';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const courseQuery = searchParams.get('course');

    if (!courseQuery) {
        return NextResponse.json({ error: 'Course parameter required' }, { status: 400 });
    }

    try {
        const course = findCourseByCode(courseQuery);

        if (course) {
            return NextResponse.json({
                course: `${course.subject} ${course.catalogNumber}`,
                prerequisite: course.courseRequisites || course.enrollmentRequirements || 'None',
                prereqId: course.courseRequisites || ''
            });
        }

        return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    } catch (error) {
        console.error('Error reading CSV:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
