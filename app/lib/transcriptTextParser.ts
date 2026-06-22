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

const gradeTokens = new Set([
    'A+', 'A', 'A-',
    'B+', 'B', 'B-',
    'C+', 'C', 'C-',
    'D+', 'D', 'D-',
    'E', 'F', 'W', 'IP', 'P', 'S',
]);

function isCourseSubject(token: string): boolean {
    return /^[A-Z]{2,5}$/.test(token) && ![
        'TERM', 'COURSE', 'GRADE', 'UNITS', 'POINTS', 'GPA', 'TOTAL',
        'AHRS', 'EHRS', 'QHRS', 'QPts', 'UNOFFICIAL', 'TRANSCRIPT',
    ].includes(token);
}

function isCatalogNumber(token: string): boolean {
    return /^\d{3}[A-Z0-9]{0,3}$/.test(token);
}

function isNumberToken(token: string): boolean {
    return /^\d+(?:\.\d+)?$/.test(token);
}

function normalizeGrade(token: string): string | null {
    const normalized = token.toUpperCase();
    return gradeTokens.has(normalized) ? normalized : null;
}

function normalizeCourseCode(code: string): string {
    return code.replace(/\s+/g, ' ').trim().toUpperCase();
}

function parseCourseFromParts(parts: string[], currentTerm: string): CourseGrade | null {
    if (parts.length < 4) return null;

    const courseCode = normalizeCourseCode(`${parts[0]} ${parts[1]}`);
    const rest = parts.slice(2);
    const gradeIndex = rest.findIndex(token => normalizeGrade(token));

    if (gradeIndex >= 0) {
        const grade = normalizeGrade(rest[gradeIndex]);
        const numericBeforeGrade = rest
            .slice(0, gradeIndex)
            .map((token, index) => ({ token, index }))
            .filter(item => isNumberToken(item.token));

        const unitsToken = numericBeforeGrade[0];
        if (!grade || !unitsToken) return null;

        const description = rest
            .slice(0, unitsToken.index)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (description.length < 2) return null;

        return {
            course: courseCode,
            description,
            grade,
            credits: parseFloat(unitsToken.token) || 3,
            term: currentTerm,
        };
    }

    const numericItems = rest
        .map((token, index) => ({ token, index }))
        .filter(item => isNumberToken(item.token));

    if (numericItems.length >= 2 && parseFloat(numericItems[1].token) === 0) {
        const description = rest
            .slice(0, numericItems[0].index)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (description.length < 2) return null;

        return {
            course: courseCode,
            description,
            grade: 'IP',
            credits: parseFloat(numericItems[0].token) || 3,
            term: currentTerm,
        };
    }

    return null;
}

function parseTokenizedTranscript(lines: string[]): CourseGrade[] {
    const courses: CourseGrade[] = [];
    let currentTerm = 'Unknown Term';
    const termPattern = /(Fall|Spring|Summer|Winter)\s+(20\d{2})/i;
    const tokens = lines
        .flatMap(line => line.trim().split(/\s+/))
        .filter(Boolean);

    for (let i = 0; i < tokens.length; i++) {
        const termCandidate = `${tokens[i]} ${tokens[i + 1] || ''}`;
        const termMatch = termCandidate.match(termPattern);
        if (termMatch) {
            currentTerm = `${termMatch[1]} ${termMatch[2]}`;
        }

        if (!isCourseSubject(tokens[i]) || !isCatalogNumber(tokens[i + 1] || '')) {
            continue;
        }

        const rowParts = [tokens[i], tokens[i + 1]];
        let cursor = i + 2;
        while (cursor < tokens.length) {
            if (isCourseSubject(tokens[cursor]) && isCatalogNumber(tokens[cursor + 1] || '')) {
                break;
            }
            rowParts.push(tokens[cursor]);
            const parsed = parseCourseFromParts(rowParts, currentTerm);
            if (parsed) {
                courses.push(parsed);
                i = cursor;
                break;
            }
            cursor++;
        }
    }

    return courses;
}

export function extractStudentInfo(text: string): StudentInfo {
    const lines = text.split('\n');
    let name: string | null = null;
    let studentId: string | null = null;
    let dateOfBirth: string | null = null;

    const namePattern1 = /(?:Student\s*)?Name\s*[:\-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+)+)/i;
    const namePattern2 = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/;
    const studentIdPattern1 = /(?:Student\s*)?(?:ID|Id|#)\s*[:\-]?\s*(\d{7,10})/i;
    const studentIdPattern2 = /(?:EmplID|EMPLID|Empl\s*ID)\s*[:\-]?\s*(\d{7,10})/i;
    const studentIdPattern3 = /^(\d{8,10})$/;
    const dobPattern1 = /(?:Date\s*of\s*Birth|DOB|D\.O\.B|Birth\s*Date)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i;
    const dobPattern2 = /(?:Date\s*of\s*Birth|DOB|D\.O\.B|Birth\s*Date)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i;

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const line = lines[i].trim();

        if (!name) {
            let match = line.match(namePattern1);
            if (match) {
                name = match[1].trim();
            } else if (i < 10) {
                match = line.match(namePattern2);
                if (match && !line.includes('University') && !line.includes('College') && !line.includes('Transcript')) {
                    name = match[1].trim();
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

export function parseTranscriptText(text: string): ParsedTranscript {
    const studentInfo = extractStudentInfo(text);
    const courses: CourseGrade[] = [];
    const lines = text.split('\n');
    let currentTerm = 'Unknown Term';

    const termPattern = /(Fall|Spring|Summer|Winter)\s+(20\d{2})/i;
    const coursePattern = /^([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.\d{3})\s+(\d+\.\d{3})\s+([A-FW][+-]?|IP|P|S)\s+(\d+\.\d{3})/;
    const simpleCoursePattern = /([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+([A-FW][+-]?|IP|P|S)/;
    const inProgressWithPointsPattern = /^([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.\d{3})\s+(0\.000)\s+(\d+\.\d{3})$/;
    const inProgressPattern = /^([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.?\d*)\s+(0\.000)\s*$/;
    const noGradePattern = /^([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s*$/;

    for (const line of lines) {
        const trimmedLine = line.trim();
        const termMatch = trimmedLine.match(termPattern);
        if (termMatch) {
            currentTerm = `${termMatch[1]} ${termMatch[2]}`;
            continue;
        }

        if (trimmedLine.includes('Course') && trimmedLine.includes('Description')) continue;
        if (trimmedLine.includes('AHRS') || trimmedLine.includes('EHRS')) continue;
        if (trimmedLine.includes('GPA') || trimmedLine.includes('Term GPA')) continue;
        if (trimmedLine.startsWith('Course Attrib')) continue;

        const courseMatch = trimmedLine.match(coursePattern) || trimmedLine.match(simpleCoursePattern);
        if (courseMatch) {
            const grade = courseMatch[5];
            if (grade && /^[A-FW][+-]?$|^IP$|^P$|^S$/.test(grade)) {
                courses.push({
                    course: courseMatch[1].trim(),
                    description: courseMatch[2].trim(),
                    grade,
                    credits: parseFloat(courseMatch[3]) || 3,
                    term: currentTerm,
                });
            }
            continue;
        }

        let inProgressMatch = trimmedLine.match(inProgressWithPointsPattern) || trimmedLine.match(inProgressPattern);
        if (!inProgressMatch) {
            const genericMatch = trimmedLine.match(noGradePattern);
            if (genericMatch && parseFloat(genericMatch[4]) === 0) {
                inProgressMatch = genericMatch;
            }
        }

        if (inProgressMatch) {
            const courseCode = inProgressMatch[1].trim();
            const description = inProgressMatch[2].trim();
            if (courseCode && description.length > 2 && !description.includes('Description')) {
                courses.push({
                    course: courseCode,
                    description,
                    grade: 'IP',
                    credits: parseFloat(inProgressMatch[3]) || 3,
                    term: currentTerm,
                });
            }
        }
    }

    if (courses.length === 0) {
        courses.push(...parseTokenizedTranscript(lines));
    }

    const uniqueCoursesMap = new Map<string, CourseGrade>();
    const allGradesMap = new Map<string, { grade: string; term: string }[]>();
    const originalCoursesMap = new Map<string, CourseGrade>();
    const gradePoints: Record<string, number> = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'E': 0.0, 'F': 0.0, 'W': -1, 'IP': -1, 'P': 2.0, 'S': 2.0
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

    return {
        courses: Array.from(uniqueCoursesMap.values()).reverse(),
        studentInfo,
    };
}
