import type { CompletedCourse, DegreePlan, SemesterCourse } from '@/types';
import { normalizeCourseCode } from '@/app/lib/courseCodes';
import { isInProgressGrade, isPassingGrade } from '@/app/lib/transcriptUtils';

export interface RequirementStatus {
    key: string;
    label: string;
    units: number;
    status: 'satisfied' | 'in_progress' | 'remaining';
    matchedCourseId?: string;
    semester?: string;
}

export interface ElectiveCategoryStatus {
    id: string;
    name: string;
    requiredUnits: number;
    earnedUnits: number;
    remainingUnits: number;
    matchedCourses: string[];
}

export interface DegreeAuditResult {
    planId: string;
    planName: string;
    catalogYear: string;
    totalUnitsRequired: number;
    unitsEarned: number;
    unitsInProgress: number;
    unitsRemaining: number;
    requirements: RequirementStatus[];
    electiveCategories: ElectiveCategoryStatus[];
    satisfiedCount: number;
    remainingCount: number;
    inProgressCount: number;
}

function completedById(courses: CompletedCourse[]): Map<string, CompletedCourse> {
    return new Map(courses.map((course) => [course.courseId, course]));
}

function inProgressIds(allGrades: Array<{ courseId: string; grade: string }>): Set<string> {
    return new Set(
        allGrades
            .filter((entry) => isInProgressGrade(entry.grade))
            .map((entry) => entry.courseId),
    );
}

function slotCandidates(course: SemesterCourse): string[] {
    if (course.courseId) {
        return [normalizeCourseCode(course.courseId) || course.courseId];
    }
    return (course.options || [])
        .map((option) => normalizeCourseCode(option) || option)
        .filter(Boolean);
}

function auditRequiredSlot(
    course: SemesterCourse,
    completed: Map<string, CompletedCourse>,
    inProgress: Set<string>,
    index: number,
): RequirementStatus {
    const candidates = slotCandidates(course);
    const label = course.courseId
        ? course.courseId
        : course.electiveType || `Elective slot ${index + 1}`;

    for (const candidate of candidates) {
        if (completed.has(candidate)) {
            const match = completed.get(candidate)!;
            return {
                key: `${label}-${candidate}`,
                label,
                units: course.units,
                status: 'satisfied',
                matchedCourseId: candidate,
                semester: `${match.term} ${match.year}`.trim(),
            };
        }
    }

    for (const candidate of candidates) {
        if (inProgress.has(candidate)) {
            return {
                key: `${label}-${candidate}`,
                label,
                units: course.units,
                status: 'in_progress',
                matchedCourseId: candidate,
            };
        }
    }

    return {
        key: `${label}-remaining`,
        label,
        units: course.units,
        status: 'remaining',
    };
}

function auditElectiveCategories(
    plan: DegreePlan,
    completed: Map<string, CompletedCourse>,
): ElectiveCategoryStatus[] {
    const used = new Set<string>();

    return (plan.electiveCategories || []).map((category) => {
        const eligible = new Set(
            (category.eligibleCourses || []).map((courseId) => normalizeCourseCode(courseId) || courseId),
        );

        let earnedUnits = 0;
        const matchedCourses: string[] = [];

        for (const [courseId, course] of completed.entries()) {
            if (used.has(courseId)) continue;

            const matchesEligible = eligible.size > 0 && eligible.has(courseId);
            const matchesUpperDivisionRule =
                eligible.size === 0 &&
                category.rules?.some((rule) => rule.toLowerCase().includes('300-level')) &&
                parseInt(courseId.split('-')[1] || '0', 10) >= 300;

            if (matchesEligible || matchesUpperDivisionRule) {
                earnedUnits += course.units;
                matchedCourses.push(courseId);
                used.add(courseId);
            }
        }

        return {
            id: category.id,
            name: category.name,
            requiredUnits: category.requiredUnits,
            earnedUnits,
            remainingUnits: Math.max(0, category.requiredUnits - earnedUnits),
            matchedCourses,
        };
    });
}

export function runDegreeAudit(
    plan: DegreePlan,
    completedCourses: CompletedCourse[],
    rawGrades: Array<{ courseId: string; grade: string }> = [],
): DegreeAuditResult {
    const completed = completedById(completedCourses);
    const inProgress = inProgressIds(rawGrades);

    const requirements: RequirementStatus[] = [];
    plan.semesters.forEach((semester) => {
        semester.courses.forEach((course, index) => {
            requirements.push(auditRequiredSlot(course, completed, inProgress, index));
        });
    });

    const electiveCategories = auditElectiveCategories(plan, completed);

    const unitsEarned = completedCourses
        .filter((course) => isPassingGrade(course.grade))
        .reduce((sum, course) => sum + course.units, 0);

    const unitsInProgress = rawGrades
        .filter((entry) => isInProgressGrade(entry.grade))
        .reduce((sum, entry) => {
            const match = completed.get(entry.courseId);
            return sum + (match?.units || 0);
        }, 0);

    const planRequiredUnits = plan.totalUnits;
    const unitsRemaining = Math.max(0, planRequiredUnits - unitsEarned - unitsInProgress);

    const satisfiedCount = requirements.filter((req) => req.status === 'satisfied').length;
    const inProgressCount = requirements.filter((req) => req.status === 'in_progress').length;
    const remainingCount = requirements.filter((req) => req.status === 'remaining').length;

    return {
        planId: plan.id,
        planName: plan.name,
        catalogYear: plan.catalogYear,
        totalUnitsRequired: planRequiredUnits,
        unitsEarned,
        unitsInProgress,
        unitsRemaining,
        requirements,
        electiveCategories,
        satisfiedCount,
        remainingCount,
        inProgressCount,
    };
}
