export interface StudentInfo {
    name: string | null;
    studentId: string | null;
    dateOfBirth: string | null;
}

export interface CourseGrade {
    course: string;
    description: string;
    grade: string;
    credits: number;
    term: string;
    isRetake?: boolean;
    originalGrade?: string;
    originalTerm?: string;
    allGrades?: string[];
    bestGrade?: string;
    bestGradeTerm?: string;
}

export interface ParsedTranscript {
    courses: CourseGrade[];
    studentInfo: StudentInfo;
}

/**
 * UAccess repeats a "Name: <name>  Page N of M" header on every page. Strip the
 * page marker (and any trailing non-name noise) so verification compares a clean
 * name (design choice G1).
 */
function sanitizeName(raw: string): string {
    return raw
        .replace(/\s+/g, ' ')
        .replace(/\bPage\b.*$/i, '')
        .replace(/[^A-Za-z'.\-\s]+.*$/,'')
        .trim();
}

export function extractStudentInfo(text: string): StudentInfo {
    const lines = text.split('\n');
    let name: string | null = null;
    let studentId: string | null = null;
    let dateOfBirth: string | null = null;

    const namePattern1 = /(?:Student\s*)?Name\s*[:\-]?\s*([A-Za-z][A-Za-z'.\-]*(?:\s+[A-Za-z][A-Za-z'.\-]*)+)/i;
    const namePattern2 = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/;
    const studentIdPattern1 = /(?:Student\s*)?(?:ID|Id|#)\s*[:\-]?\s*(\d{7,10})/i;
    const studentIdPattern2 = /(?:EmplID|EMPLID|Empl\s*ID)\s*[:\-]?\s*(\d{7,10})/i;
    const studentIdPattern3 = /^(\d{8,10})$/;
    const dobPattern1 = /(?:Date\s*of\s*Birth|DOB|D\.O\.B|Birth\s*Date|Birthdate)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i;
    const dobPattern2 = /(?:Date\s*of\s*Birth|DOB|D\.O\.B|Birth\s*Date|Birthdate)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i;

    for (let i = 0; i < Math.min(lines.length, 60); i++) {
        const line = lines[i].trim();

        if (!name) {
            const match = line.match(namePattern1);
            if (match) {
                const cleaned = sanitizeName(match[1]);
                if (cleaned) name = cleaned;
            } else if (i < 12) {
                const standalone = line.match(namePattern2);
                if (standalone && !line.includes('University') && !line.includes('College') && !line.includes('Transcript')) {
                    name = standalone[1].trim();
                }
            }
        }

        if (!studentId) {
            let match = line.match(studentIdPattern1) || line.match(studentIdPattern2);
            if (match) {
                studentId = match[1].trim();
            } else {
                match = line.match(studentIdPattern3);
                if (match && line.length === match[1].length) {
                    studentId = match[1].trim();
                }
            }
        }

        if (!dateOfBirth) {
            const match = line.match(dobPattern1) || line.match(dobPattern2);
            if (match) {
                dateOfBirth = match[1].trim();
            }
        }

        if (name && studentId && dateOfBirth) break;
    }

    return { name, studentId, dateOfBirth };
}

const GRADE_TOKEN = /^(?:[A-FW][+-]?|IP|P|S)$/;

// Graded course row: CODE, description, AHRS, EHRS, GRADE. The trailing Points
// value is intentionally NOT required — column splitting can land between the
// Grade and Points columns, so anchoring on Points would drop otherwise valid
// rows. Global flag + non-greedy description also lets matchAll recover a second
// course from a still-merged line (design choice C1 fallback).
const fullRowPattern = /([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.\d{3})\s+(\d+\.\d{3})\s+([A-FW][+-]?|IP|P|S)(?![A-Za-z0-9])/g;

const termPattern = /(Fall|Spring|Summer|Winter)\s+(20\d{2})/i;

// Table-structure noise that can leak onto a term-header line when column
// splitting lands mid-table (e.g. col-1's "Points" value bleeding next to the
// col-2 "Spring 2026" header). Stripping it lets us still recognize the term.
const TERM_NOISE = /\b(Points?|AHRS|EHRS|QHRS|Grade|Course|Description|GPA|Term|Cum|Combined|Transfer|Honor|Dean's|List|Full|Time|Academic|Year|Distinction)\b/gi;

// In-progress / no-grade rows: "CSC 380 Principles of Data Science 3.000 0.000 0.000".
const inProgressPattern = /^([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.\d{3})\s+(0\.000)(?:\s+0\.000)?\s*$/;

/**
 * Return the term ("Fall 2024") if the line is a term header, else null. Written
 * to tolerate a small amount of stray column-bleed around the term words rather
 * than requiring a perfectly isolated header (design choice D3 via E1).
 */
function detectTermLine(line: string): string | null {
    const match = line.match(termPattern);
    if (!match) return null;
    // A real course row is never a term header.
    fullRowPattern.lastIndex = 0;
    if (fullRowPattern.test(line)) return null;

    const remainder = line
        .replace(termPattern, ' ')
        .replace(TERM_NOISE, ' ')
        .replace(/[0-9.:,\-#&/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Accept when what's left around the term is negligible noise.
    if (remainder.length > 3) return null;
    return `${capitalize(match[1])} ${match[2]}`;
}

export function parseTranscriptText(text: string): ParsedTranscript {
    const studentInfo = extractStudentInfo(text);
    const courses: CourseGrade[] = [];
    const lines = text.split('\n');
    let currentTerm = 'Unknown Term';

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const term = detectTermLine(line);
        if (term) {
            currentTerm = term;
            continue;
        }

        // Primary path (C2): with column-aware extraction each line holds at
        // most one course. matchAll also recovers a second course from any
        // still-merged line (C1 fallback).
        let matchedCourse = false;
        fullRowPattern.lastIndex = 0;
        for (const match of line.matchAll(fullRowPattern)) {
            const grade = match[5];
            if (!GRADE_TOKEN.test(grade)) continue;
            courses.push({
                course: match[1].trim(),
                description: match[2].trim(),
                grade,
                credits: parseFloat(match[3]) || 3,
                term: currentTerm,
            });
            matchedCourse = true;
        }
        if (matchedCourse) continue;

        const inProgress = line.match(inProgressPattern);
        if (inProgress) {
            const courseCode = inProgress[1].trim();
            const description = inProgress[2].trim();
            if (description.length > 2 && !/description/i.test(description)) {
                courses.push({
                    course: courseCode,
                    description,
                    grade: 'IP',
                    credits: parseFloat(inProgress[3]) || 3,
                    term: currentTerm,
                });
            }
        }
    }

    return {
        courses: deduplicateCourses(courses),
        studentInfo,
    };
}

function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Collapse retakes/duplicates to one entry per course, recording retake history
 * and the best grade achieved. Order-sensitive: assumes `courses` is in reading
 * order (which column linearization preserves).
 */
function deduplicateCourses(courses: CourseGrade[]): CourseGrade[] {
    const uniqueCoursesMap = new Map<string, CourseGrade>();
    const allGradesMap = new Map<string, { grade: string; term: string }[]>();
    const originalCoursesMap = new Map<string, CourseGrade>();
    const gradePoints: Record<string, number> = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'E': 0.0, 'F': 0.0, 'W': -1, 'IP': -1, 'P': 2.0, 'S': 2.0,
    };

    for (const course of courses) {
        const key = course.course;
        if (!originalCoursesMap.has(key)) originalCoursesMap.set(key, course);
        if (course.grade !== 'IP' && course.grade !== 'W') {
            const grades = allGradesMap.get(key) || [];
            grades.push({ grade: course.grade, term: course.term });
            allGradesMap.set(key, grades);
        }
    }

    for (let i = courses.length - 1; i >= 0; i--) {
        const course = courses[i];
        const key = course.course;
        if (uniqueCoursesMap.has(key)) continue;

        const allGradesWithTerms = allGradesMap.get(key) || [];
        const allGrades = allGradesWithTerms.map(g => g.grade);
        const original = originalCoursesMap.get(key);
        let bestGrade = course.grade;
        let bestGradeTerm = course.term;

        if (allGradesWithTerms.length > 0) {
            let bestPoints = -2;
            for (const g of allGradesWithTerms) {
                const points = gradePoints[g.grade] ?? 0;
                if (points > bestPoints) {
                    bestPoints = points;
                    bestGrade = g.grade;
                    bestGradeTerm = g.term;
                }
            }
        }

        if (original && original.term !== course.term && allGrades.length > 1) {
            uniqueCoursesMap.set(key, {
                ...course,
                isRetake: true,
                originalGrade: original.grade,
                originalTerm: original.term,
                allGrades,
                bestGrade,
                bestGradeTerm,
            });
        } else {
            uniqueCoursesMap.set(key, course);
        }
    }

    return Array.from(uniqueCoursesMap.values()).reverse();
}
