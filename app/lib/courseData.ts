export interface Course {
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

// Fetch courses from the API (reads from CSV file on server)
export async function fetchCourses(): Promise<Course[]> {
    const response = await fetch('/api/courses');
    if (!response.ok) {
        throw new Error('Failed to fetch courses');
    }
    const data = await response.json();
    return data.courses;
}

// Cache for courses loaded via getCourses (kept for backward compatibility with server-side code)
let coursesCache: Course[] | null = null;

// Synchronous getter — uses cache populated by setCourses or returns empty array
// For client components, call fetchCourses() and setCourses() first
export function getCourses(): Course[] {
    return coursesCache || [];
}

// Set courses cache (called after fetching from API)
export function setCourses(courses: Course[]): void {
    coursesCache = courses;
}

// Search courses by code
export function searchCourseByCode(code: string): Course | undefined {
    const courses = getCourses();
    return courses.find(c =>
        c.courseCode.toUpperCase() === code.toUpperCase()
    );
}

// Search courses by name (partial match)
export function searchCoursesByName(name: string): Course[] {
    const courses = getCourses();
    const searchLower = name.toLowerCase();
    return courses.filter(c =>
        c.courseName.toLowerCase().includes(searchLower) ||
        c.courseCode.toLowerCase().includes(searchLower) ||
        c.department.toLowerCase().includes(searchLower)
    );
}

// Get prerequisites for a course
export function getPrerequisites(courseCode: string): Course[] {
    const course = searchCourseByCode(courseCode);
    if (!course) return [];

    const courses = getCourses();
    const prerequisites: Course[] = [];

    // Parse prerequisite strings and find matching courses
    const parsePrereqString = (prereqStr: string): string[] => {
        if (!prereqStr || prereqStr === 'None') return [];

        // Handle "OR" separated prerequisites
        return prereqStr
            .split(' or ')
            .map(p => {
                // Extract course code (e.g., "MATH 113" from "MATH 113 or placement test")
                const match = p.match(/[A-Z]{2,4}\s\d{3}[A-Z]?/);
                return match ? match[0] : '';
            })
            .filter(code => code !== '');
    };

    const prereqCodes = [
        ...parsePrereqString(course.prerequisite1),
        ...parsePrereqString(course.prerequisite2)
    ];

    prereqCodes.forEach(code => {
        const prereq = searchCourseByCode(code);
        if (prereq && !prerequisites.find(p => p.courseCode === prereq.courseCode)) {
            prerequisites.push(prereq);
        }
    });

    return prerequisites;
}

// Get all courses in a department
export function getCoursesByDepartment(department: string): Course[] {
    const courses = getCourses();
    return courses.filter(c =>
        c.department.toLowerCase() === department.toLowerCase()
    );
}

// Get all courses of a certain level
export function getCoursesByLevel(level: string): Course[] {
    const courses = getCourses();
    return courses.filter(c =>
        c.level.toLowerCase() === level.toLowerCase()
    );
}

// Get all unique departments
export function getDepartments(): string[] {
    const courses = getCourses();
    return [...new Set(courses.map(c => c.department))].sort();
}

interface BatchRecommendation {
    name: string;
    description: string;
}

export function getBatchRecommendation(percentage: number): BatchRecommendation {
    if (percentage >= 90) {
        return {
            name: 'Fast Track',
            description: 'You have demonstrated mastery. Eligible for the accelerated 7-week track.'
        };
    } else if (percentage >= 75) {
        return {
            name: 'Standard Track',
            description: 'You are well-prepared. Recommended for the standard full-semester track.'
        };
    } else {
        return {
            name: 'Supported Track',
            description: 'Additional support recommended. Full semester track with tutoring included.'
        };
    }
}