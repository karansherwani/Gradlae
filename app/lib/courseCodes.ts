/**
 * Canonical course code normalization for transcript, catalog, and degree-plan data.
 * All internal graph/plan IDs use SUBJ-NUM (e.g. CSC-110).
 */

const COURSE_CODE_PATTERN = /([A-Z]{2,5})[\s-]?(\d{3}[A-Z]*)/i;

export function normalizeCourseCode(input: string): string | null {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return null;

    const direct = trimmed.match(/^([A-Z]{2,5})-(\d{3}[A-Z]*)$/);
    if (direct) {
        return `${direct[1]}-${direct[2]}`;
    }

    const spaced = trimmed.match(/^([A-Z]{2,5})\s+(\d{3}[A-Z]*)$/);
    if (spaced) {
        return `${spaced[1]}-${spaced[2]}`;
    }

    const embedded = trimmed.match(COURSE_CODE_PATTERN);
    if (embedded) {
        return `${embedded[1]}-${embedded[2]}`;
    }

    return null;
}

export function courseCodeToDisplay(courseId: string): string {
    const normalized = normalizeCourseCode(courseId);
    if (!normalized) return courseId;
    const [subject, number] = normalized.split('-');
    return `${subject} ${number}`;
}

export function courseCodesMatch(a: string, b: string): boolean {
    const left = normalizeCourseCode(a);
    const right = normalizeCourseCode(b);
    if (!left || !right) return false;
    return left === right;
}
