// app/api/courses/route.ts
// Reads courses from the canonical courses.csv file and returns filtered results

import { NextRequest, NextResponse } from 'next/server';
import { loadAllCourses, Course } from '@/app/lib/loadCourses';

const MAX_RESULTS = 50; // Cap for filtered results
const MAX_UNFILTERED = 200; // Cap when no query is provided

export async function GET(request: NextRequest) {
    try {
        const allCourses = loadAllCourses();

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');
        const limit = Math.min(
            parseInt(searchParams.get('limit') || String(MAX_RESULTS)),
            MAX_RESULTS
        );

        if (query && query.length >= 2) {
            const q = query.toLowerCase();

            const filtered = allCourses.filter((c: Course) => {
                const code = `${c.subject} ${c.catalogNumber}`.toLowerCase();
                return (
                    code.includes(q) ||
                    c.title.toLowerCase().includes(q) ||
                    c.description.toLowerCase().includes(q) ||
                    c.subject.toLowerCase().includes(q)
                );
            });

            return NextResponse.json({
                courses: filtered.slice(0, limit),
                total: allCourses.length,
                matched: filtered.length,
            });
        }

        // No query: return a capped subset to avoid sending the full catalog to the client.
        return NextResponse.json({
            courses: allCourses.slice(0, MAX_UNFILTERED),
            total: allCourses.length,
        });
    } catch (error) {
        console.error('Courses API Error:', error);
        return NextResponse.json(
            { error: 'Failed to load courses' },
            { status: 500 }
        );
    }
}
