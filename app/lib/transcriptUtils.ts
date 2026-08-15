import type { CompletedCourse } from '@/types';
import { normalizeCourseCode } from '@/app/lib/courseCodes';

export interface TranscriptCourseRow {
    course: string;
    description?: string;
    grade: string;
    credits: number;
    term: string;
    isRetake?: boolean;
    bestGrade?: string;
}

const PASSING_GRADES = new Set([
    'A+', 'A', 'A-',
    'B+', 'B', 'B-',
    'C+', 'C', 'C-',
    'D+', 'D', 'D-',
    'P', 'S',
]);

function parseTerm(term: string): { semester: string; year: number } {
    const match = term.match(/(Fall|Spring|Summer|Winter)\s+(\d{4})/i);
    if (!match) {
        return { semester: term || 'Unknown', year: 0 };
    }
    return { semester: match[1], year: parseInt(match[2], 10) };
}

export function isPassingGrade(grade: string): boolean {
    return PASSING_GRADES.has(grade.trim().toUpperCase());
}

export function isInProgressGrade(grade: string): boolean {
    return grade.trim().toUpperCase() === 'IP';
}

export function transcriptCoursesToCompleted(
    courses: TranscriptCourseRow[],
    options: { includeInProgress?: boolean } = {},
): CompletedCourse[] {
    const includeInProgress = options.includeInProgress ?? false;
    const byCode = new Map<string, CompletedCourse>();

    for (const course of courses) {
        const courseId = normalizeCourseCode(course.course);
        if (!courseId) continue;

        const grade = (course.bestGrade || course.grade || '').trim().toUpperCase();
        if (!includeInProgress && isInProgressGrade(grade)) continue;
        if (!includeInProgress && !isPassingGrade(grade) && grade !== 'IP') continue;

        const { semester, year } = parseTerm(course.term);
        const completed: CompletedCourse = {
            courseId,
            courseName: course.description || course.course,
            grade,
            units: course.credits || 0,
            semester,
            term: semester,
            year,
        };

        const existing = byCode.get(courseId);
        if (!existing) {
            byCode.set(courseId, completed);
            continue;
        }

        // Prefer the best passing grade when duplicates exist.
        if (isPassingGrade(grade) && !isPassingGrade(existing.grade)) {
            byCode.set(courseId, completed);
        }
    }

    return Array.from(byCode.values());
}

export function completedCourseIds(courses: TranscriptCourseRow[]): Set<string> {
    return new Set(
        transcriptCoursesToCompleted(courses).map((course) => course.courseId),
    );
}
