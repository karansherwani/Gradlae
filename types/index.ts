// types/index.ts

/**
 * Represents a course from the university catalog
 */
export interface Course {
  id: string;                    // e.g., "ECE-101"
  courseId: number;              // Original course ID from CSV
  subjectCode: string;           // e.g., "ECE"
  catalogNumber: string;         // e.g., "101"
  title: string;                 // e.g., "Programming 1"
  description: string;           // Full course description
  units: {
    min: number;
    max: number;
  };
  prerequisites: PrerequisiteNode;
  corequisites?: string[];       // Courses that must be taken concurrently
  components: string[];          // e.g., ["Lecture", "Laboratory"]
  attributes: string[];          // e.g., ["GEED - EPNAT"]
  offeringUnit: string;          // Department offering the course
  gradingBasis: string;          // e.g., "GRD - Regular Grades A, B, C, D, E"
  repeatable: boolean;
  enrollmentRequirements?: string;
}

/**
 * Prerequisite structure - can be nested for complex logic
 */
export interface PrerequisiteNode {
  type: 'AND' | 'OR' | 'COURSE' | 'NONE';
  value?: string;                // Course ID if type is 'COURSE'
  children?: PrerequisiteNode[]; // Nested prerequisites
  minGrade?: string;             // Minimum grade required (e.g., "C")
  raw?: string;                  // Original prerequisite string
}

/**
 * A course in a semester plan
 */
export interface SemesterCourse {
  courseId?: string;             // Specific course ID (for required courses)
  title?: string;                // Course title
  category: 'required' | 'elective';
  electiveType?: string;         // e.g., "Upper Division Computing Electives"
  options?: string[];            // Specific course options for electives
  units: number;
  prerequisites?: string;        // Human-readable prerequisites
}

/**
 * A semester in the degree plan
 */
export interface Semester {
  number: number;                // 1-8
  name: string;                  // e.g., "1st Semester", "Fall Year 1"
  courses: SemesterCourse[];
  totalUnits: {
    min: number;
    max: number;
  };
  notes?: string[];              // Special notes for this semester
}

/**
 * Complete degree plan (4-year plan)
 */
export interface DegreePlan {
  id: string;
  name: string;                  // e.g., "B.S. in Computer Science and Engineering"
  catalogYear: string;           // e.g., "2025-26"
  totalUnits: number;            // e.g., 128
  semesters: Semester[];
  electiveCategories: ElectiveCategory[];
  notes?: string[];
}

/**
 * Elective category definition
 */
export interface ElectiveCategory {
  id: string;
  name: string;                  // e.g., "Upper Division Computing Electives"
  requiredUnits: number;         // Total units needed
  description?: string;
  eligibleCourses?: string[];    // List of course IDs that satisfy this
  rules?: string[];              // Special rules (e.g., "Must be 300-level or higher")
}

/**
 * Student's completed course
 */
export interface CompletedCourse {
  courseId: string;              // e.g., "MATH-125"
  courseName: string;            // e.g., "Calculus I"
  grade: string;                 // e.g., "A", "B", "C"
  units: number;
  semester: string;              // e.g., "Fall 2025"
  term: string;                  // e.g., "Fall", "Spring", "Summer"
  year: number;                  // e.g., 2025
}

/**
 * Transfer credit from AP, IB, or other institution
 */
export interface TransferCredit {
  source: string;                // e.g., "AP Calculus AB", "Community College"
  equivalentCourseId: string;    // What it counts as
  units: number;
  grade?: string;
}

/**
 * Student profile
 */
export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  major: string;
  minor?: string;
  degreePlanId: string;          // Which 4-year plan they're following
  startYear: number;             // e.g., 2025
  startTerm: 'Fall' | 'Spring' | 'Summer';
  currentSemester: number;       // 1-8
  completedCourses: CompletedCourse[];
  transferCredits?: TransferCredit[];
  interests?: string[];          // e.g., ["Machine Learning", "Web Development"]
  careerGoals?: string;
}

/**
 * Course recommendation from AI
 */
export interface CourseRecommendation {
  course: Course;
  reason: string;                // Why this course is recommended
  priority: 'high' | 'medium' | 'low';
  category: string;              // e.g., "Required", "Recommended Elective"
}

/**
 * Schedule validation result
 */
export interface ScheduleValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalUnits: number;
}

/**
 * Prerequisite check result
 */
export interface PrerequisiteCheck {
  eligible: boolean;
  missing: string[];             // Missing prerequisite course IDs
  missingDetails: {
    courseId: string;
    courseName: string;
    reason: string;              // e.g., "Not completed", "Grade too low"
  }[];
}

/**
 * Degree audit result
 */
export interface DegreeAudit {
  totalUnitsCompleted: number;
  totalUnitsRequired: number;
  percentComplete: number;
  onTrack: boolean;
  categories: {
    name: string;
    completed: number;
    required: number;
    status: 'complete' | 'in-progress' | 'not-started';
  }[];
  missingRequirements: string[];
  projectedGraduation: {
    semester: number;
    term: string;
    year: number;
  };
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    courses?: string[];          // Courses mentioned in this message
    action?: string;             // e.g., "recommend", "validate", "audit"
  };
}

/**
 * AI context for chat
 */
export interface AIContext {
  studentProfile: StudentProfile;
  eligibleCourses: Course[];
  degreePlan: DegreePlan;
  conversationHistory: ChatMessage[];
}