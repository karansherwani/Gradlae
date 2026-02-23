export interface Course {
    courseCode: string;    // e.g. "CSC 110"
    courseName: string;
    department: string;
    credits: number;
    description: string;
    // Legacy fields kept for backward compat – may be empty
    track: string;
    level: string;
    prerequisite1: string;
    prerequisite2: string;
}

// Fetch courses from the API (reads from CSV on server, searches 18K+ courses)
export async function fetchCourses(query?: string): Promise<Course[]> {
    const url = query && query.length >= 2
        ? `/api/courses?q=${encodeURIComponent(query)}&limit=50`
        : '/api/courses';

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch courses');
    }
    const data = await response.json();

    // Map from the new API shape to the UI shape
    return (data.courses || []).map((c: Record<string, string | number>) => ({
        courseCode: `${c.subject || ''} ${c.catalogNumber || ''}`.trim() || c.courseCode || '',
        courseName: c.title || c.courseName || '',
        department: c.offeringUnit || c.department || '',
        credits: c.minUnits || c.credits || 0,
        description: c.description || '',
        track: c.track || '',
        level: c.level || '',
        prerequisite1: c.enrollmentRequirements || c.prerequisite1 || '',
        prerequisite2: c.courseRequisites || c.prerequisite2 || '',
    })) as Course[];
}

// Cache for courses loaded via getCourses (kept for backward compatibility)
let coursesCache: Course[] | null = null;

export function getCourses(): Course[] {
    return coursesCache || [];
}

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

    const parsePrereqString = (prereqStr: string): string[] => {
        if (!prereqStr || prereqStr === 'None' || prereqStr === '-') return [];

        return prereqStr
            .split(' or ')
            .map(p => {
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