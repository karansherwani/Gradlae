// lib/parseTranscriptPDF.ts
// Use pdf-parse v2 with the named PDFParse export
import { PDFParse } from 'pdf-parse';

// Student Information extracted from transcript
export interface StudentInfo {
    name: string | null;
    studentId: string | null;
    dateOfBirth: string | null;
}

export interface ParsedTranscript {
    courses: CourseGrade[];
    studentInfo: StudentInfo;
}

export interface CourseGrade {
    course: string;
    description: string;
    grade: string;
    credits: number;
    term: string;
    isRetake?: boolean;      // Flag if this course was retaken
    originalGrade?: string;  // Original grade if retaken
    originalTerm?: string;   // Original term if retaken
    allGrades?: string[];    // All grades if taken multiple times (for averaging)
    bestGrade?: string;      // Best grade achieved (for display)
    bestGradeTerm?: string;  // Term when best grade was achieved
}

/**
 * Extract student information from transcript text
 */
function extractStudentInfo(text: string): StudentInfo {
    const lines = text.split('\n');
    let name: string | null = null;
    let studentId: string | null = null;
    let dateOfBirth: string | null = null;

    // Common patterns for student name
    // Pattern 1: "Name: John Doe" or "Student Name: John Doe"
    const namePattern1 = /(?:Student\s*)?Name\s*[:\-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+)+)/i;
    // Pattern 2: Look for a capitalized name near the top (typically first few lines)
    const namePattern2 = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/;

    // Student ID patterns - typically 8-10 digits
    const studentIdPattern1 = /(?:Student\s*)?(?:ID|Id|#)\s*[:\-]?\s*(\d{7,10})/i;
    const studentIdPattern2 = /(?:EmplID|EMPLID|Empl\s*ID)\s*[:\-]?\s*(\d{7,10})/i;
    const studentIdPattern3 = /^(\d{8,10})$/; // Standalone 8-10 digit number

    // Date of Birth patterns
    const dobPattern1 = /(?:Date\s*of\s*Birth|DOB|D\.O\.B|Birth\s*Date)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i;
    const dobPattern2 = /(?:Date\s*of\s*Birth|DOB|D\.O\.B|Birth\s*Date)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i;

    // Search through lines for student info
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const line = lines[i].trim();

        // Try to find student name
        if (!name) {
            let match = line.match(namePattern1);
            if (match) {
                name = match[1].trim();
            } else if (i < 10) {
                // Check for capitalized name in first 10 lines
                match = line.match(namePattern2);
                if (match && !line.includes('University') && !line.includes('College') && !line.includes('Transcript')) {
                    name = match[1].trim();
                }
            }
        }

        // Try to find student ID
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

        // Try to find date of birth
        if (!dateOfBirth) {
            const match = line.match(dobPattern1) || line.match(dobPattern2);
            if (match) {
                dateOfBirth = match[1].trim();
            }
        }

        // Stop if we found all info
        if (name && studentId && dateOfBirth) break;
    }

    console.log('Extracted student info:', { name, studentId, dateOfBirth });
    return { name, studentId, dateOfBirth };
}

/**
 * Parse a PDF transcript to extract course grades and student information
 * Uses pdf-parse v2 API for Node.js/Next.js server environment
 */
export async function parseTranscriptPDF(buffer: Buffer): Promise<ParsedTranscript> {
    try {
        // Convert Buffer to Uint8Array for pdf-parse v2
        const uint8Array = new Uint8Array(buffer);
        // Create PDFParse instance and get text
        const pdfParser = new PDFParse({ data: uint8Array });
        const result = await pdfParser.getText();
        const text = result.text;

        // Extract student information for verification
        const studentInfo = extractStudentInfo(text);

        // Extract Courses
        const courses: CourseGrade[] = [];
        const lines = text.split('\n');
        let currentTerm = 'Unknown Term';

        const termPattern = /(Fall|Spring|Summer|Winter)\s+(20\d{2})/i;
        // Pattern for completed courses with grades (AHRS EHRS Grade Points format)
        const coursePattern = /^([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.\d{3})\s+(\d+\.\d{3})\s+([A-FW][+-]?|IP|P|S)\s+(\d+\.\d{3})/;
        const simpleCoursePattern = /([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+([A-FW][+-]?|IP|P|S)/;

        // Pattern for in-progress courses: CourseCode Description AHRS EHRS Points (no grade, EHRS=0.000)
        // Format: "CSC 210    Software Development    4.000    0.000    0.000"
        const inProgressWithPointsPattern = /^([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.\d{3})\s+(0\.000)\s+(\d+\.\d{3})$/;

        // Alternative pattern for courses with just AHRS and EHRS (no points column visible)
        const inProgressPattern = /^([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.?\d*)\s+(0\.000)\s*$/;

        // Generic pattern for courses with credits but no grade
        const noGradePattern = /^([A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3})\s+(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s*$/;

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Check for term header
            const termMatch = trimmedLine.match(termPattern);
            if (termMatch) {
                currentTerm = `${termMatch[1]} ${termMatch[2]}`;
                console.log('Found term:', currentTerm);
                continue;
            }

            // Skip header lines and non-course lines
            if (trimmedLine.includes('Course') && trimmedLine.includes('Description')) continue;
            if (trimmedLine.includes('AHRS') || trimmedLine.includes('EHRS')) continue;
            if (trimmedLine.includes('GPA') || trimmedLine.includes('Term GPA')) continue;
            if (trimmedLine.startsWith('Course Attrib')) continue;

            // Try to match completed courses first (with grade)
            let courseMatch = trimmedLine.match(coursePattern);
            if (!courseMatch) {
                courseMatch = trimmedLine.match(simpleCoursePattern);
            }

            if (courseMatch) {
                const courseCode = courseMatch[1].trim();
                const description = courseMatch[2].trim();
                const credits = parseFloat(courseMatch[3]) || 3;
                const grade = courseMatch[5];

                if (grade && /^[A-FW][+-]?$|^IP$|^P$|^S$/.test(grade)) {
                    courses.push({
                        course: courseCode,
                        description: description,
                        grade: grade,
                        credits: credits,
                        term: currentTerm,
                    });
                }
                continue;
            }

            // Try to match in-progress courses (no grade, EHRS = 0.000)
            let inProgressMatch = trimmedLine.match(inProgressWithPointsPattern);
            if (!inProgressMatch) {
                inProgressMatch = trimmedLine.match(inProgressPattern);
            }
            if (!inProgressMatch) {
                // Check if it matches generic no-grade pattern and EHRS is 0
                const genericMatch = trimmedLine.match(noGradePattern);
                if (genericMatch && parseFloat(genericMatch[4]) === 0) {
                    inProgressMatch = genericMatch;
                }
            }

            if (inProgressMatch) {
                const courseCode = inProgressMatch[1].trim();
                const description = inProgressMatch[2].trim();
                const credits = parseFloat(inProgressMatch[3]) || 3;

                // Check if this looks like a valid course (not a header or other text)
                if (courseCode && description && description.length > 2 && !description.includes('Description')) {
                    courses.push({
                        course: courseCode,
                        description: description,
                        grade: 'IP', // In Progress
                        credits: credits,
                        term: currentTerm,
                    });
                }
            }
        }

        // De-duplicate courses by keeping the most recent occurrence
        // Track retakes: if a course appears multiple times, mark it as a retake
        // and store all grades for proper GPA calculation
        const uniqueCoursesMap = new Map<string, CourseGrade>();
        const allGradesMap = new Map<string, { grade: string; term: string }[]>(); // Store all grades with terms
        const originalCoursesMap = new Map<string, CourseGrade>(); // Store first occurrence

        // Grade points for finding best grade
        const gradePoints: Record<string, number> = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'E': 0.0, 'F': 0.0, 'W': -1, 'IP': -1, 'P': 2.0, 'S': 2.0
        };

        // First pass: collect all grades with terms for each course and find earliest occurrence
        for (const course of courses) {
            const key = course.course;
            if (!originalCoursesMap.has(key)) {
                originalCoursesMap.set(key, course);
            }
            // Collect all grades with terms (skip IP - in progress and W - withdrawn)
            if (course.grade !== 'IP' && course.grade !== 'W') {
                const grades = allGradesMap.get(key) || [];
                grades.push({ grade: course.grade, term: course.term });
                allGradesMap.set(key, grades);
            }
        }

        // Second pass: process in reverse to keep most recent, mark retakes with all grades
        for (let i = courses.length - 1; i >= 0; i--) {
            const course = courses[i];
            const key = course.course;

            if (!uniqueCoursesMap.has(key)) {
                const allGradesWithTerms = allGradesMap.get(key) || [];
                const allGrades = allGradesWithTerms.map(g => g.grade);
                const original = originalCoursesMap.get(key);

                // Find best grade and its term
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
                    // This is a retake - mark it and store all grades
                    uniqueCoursesMap.set(key, {
                        ...course,
                        isRetake: true,
                        originalGrade: original.grade,
                        originalTerm: original.term,
                        allGrades: allGrades,
                        bestGrade: bestGrade,
                        bestGradeTerm: bestGradeTerm,
                    });
                } else {
                    uniqueCoursesMap.set(key, course);
                }
            }
        }

        // Convert back to array and reverse to maintain chronological order
        const finalCourses = Array.from(uniqueCoursesMap.values()).reverse();

        console.log('Total courses parsed:', courses.length);
        console.log('Unique courses after de-duplication:', finalCourses.length);
        console.log('Terms found:', [...new Set(courses.map(c => c.term))]);

        return {
            courses: finalCourses,
            studentInfo,
        };
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error(`Failed to parse transcript PDF: ${(error as Error).message}`);
    }
}

export async function parseTranscriptImage(_buffer: Buffer): Promise<CourseGrade[]> {
    return [];
}