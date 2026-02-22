// app/api/courses/route.ts
// Reads courses from the CSV file and returns them as JSON

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface Course {
    courseCode: string;
    courseName: string;
    department: string;
    track: string;
    credits: number;
    level: string;
    prerequisite1: string;
    prerequisite2: string;
    description: string;
}

function parseCSV(csv: string): Course[] {
    const lines = csv.trim().split('\n');
    const courses: Course[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;

        // Handle quoted fields properly
        const values = line.match(/(".*?"|[^,]+)/g) || [];

        if (values.length >= 9) {
            const course: Course = {
                courseCode: values[0]!.replace(/"/g, '').trim(),
                courseName: values[1]!.replace(/"/g, '').trim(),
                department: values[2]!.replace(/"/g, '').trim(),
                track: values[3]!.replace(/"/g, '').trim(),
                credits: parseFloat(values[4]!.replace(/"/g, '').trim()),
                level: values[5]!.replace(/"/g, '').trim(),
                prerequisite1: values[6]!.replace(/"/g, '').trim(),
                prerequisite2: values[7]!.replace(/"/g, '').trim(),
                description: values[8]!.replace(/"/g, '').trim()
            };
            courses.push(course);
        }
    }

    return courses;
}

function loadCoursesFromCSV(): Course[] {
    // Try multiple possible locations for the CSV file
    const possiblePaths = [
        path.join(process.cwd(), 'app', 'data', 'uofa_courses.csv'),
        path.join(process.cwd(), 'public', 'data', 'uofa_courses.csv'),
    ];

    for (const csvPath of possiblePaths) {
        if (fs.existsSync(csvPath)) {
            const csvContent = fs.readFileSync(csvPath, 'utf-8');
            return parseCSV(csvContent);
        }
    }

    throw new Error('Course CSV file not found');
}

export async function GET(request: NextRequest) {
    try {
        const courses = loadCoursesFromCSV();

        // Optional search query
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (query && query.length >= 2) {
            const q = query.toLowerCase();
            const filtered = courses.filter(c =>
                c.courseCode.toLowerCase().includes(q) ||
                c.courseName.toLowerCase().includes(q) ||
                c.department.toLowerCase().includes(q)
            );
            return NextResponse.json({ courses: filtered, total: courses.length });
        }

        return NextResponse.json({ courses, total: courses.length });
    } catch (error) {
        console.error('Courses API Error:', error);
        return NextResponse.json(
            { error: 'Failed to load courses' },
            { status: 500 }
        );
    }
}
