export interface AdvisementStudentInfo {
    name: string | null;
    studentId: string | null;
    preparedOn: string | null;
}

export interface AdvisementGpaRequirement {
    requirement: string;
    term: string | null;
    actualGpa: number | null;
    requiredGpa: number | null;
    status: 'Satisfied' | 'Not Satisfied' | 'Unknown';
}

export interface AdvisementUnitRequirement {
    requirement: string;
    earned: number | null;
    inProgress: number | null;
    total: number | null;
    required: number | null;
    status: 'Satisfied' | 'Not Satisfied' | 'Unknown';
}

export interface AdvisementRequirementMetric {
    kind: 'Units' | 'Courses' | 'GPA';
    required: number | null;
    completed: number | null;
    needed: number | null;
}

export interface AdvisementCourse {
    term: string;
    course: string;
    title: string;
    grade: string;
    units: number;
    type?: string;
}

export interface AdvisementRequirementBlock {
    title: string;
    code: string | null;
    status: 'Satisfied' | 'Not Satisfied' | 'Unknown';
    summary: string;
    metrics: AdvisementRequirementMetric[];
    courses: AdvisementCourse[];
    availableCourses: string[];
}

export interface AdvisementReport {
    student: AdvisementStudentInfo;
    gpaRequirements: AdvisementGpaRequirement[];
    unitRequirements: AdvisementUnitRequirement[];
    requirementBlocks: AdvisementRequirementBlock[];
    missingRequirements: AdvisementRequirementBlock[];
    courseHistory: AdvisementCourse[];
}

export interface GraduationRequirementAction {
    title: string;
    code: string | null;
    summary: string;
    neededUnits: number | null;
    neededCourses: number | null;
    suggestedCourses: string[];
    alreadyCounting: AdvisementCourse[];
}

const TERM_PATTERN = '(?:Fall|Sprg|Spring|Summer|Winter)\\s+20\\d{2}';
const TERM_ONLY_PATTERN = /^(Fall|Sprg|Spring|Summer|Winter)\s+20\d{2}$/i;
const SUBJECT_PATTERN = /^[A-Z]{2,5}$/;
const CATALOG_PATTERN = /^\d{3}[A-Z0-9]*$/;
const GRADE_PATTERN = /^(A|B|C|D|E|F)[+-]?$|^W$|^IP$|^P$|^S$|^RINC$/i;
const NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

function normalizeTerm(term: string): string {
    return term.replace(/^Sprg/i, 'Spring').replace(/\s+/g, ' ').trim();
}

function normalizeCourseCode(subject: string, catalogNumber: string): string {
    return `${subject.trim().toUpperCase()} ${catalogNumber.trim().toUpperCase()}`;
}

function parseNumber(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(value: string | undefined): 'Satisfied' | 'Not Satisfied' | 'Unknown' {
    if (!value) return 'Unknown';
    return value.toLowerCase().includes('not satisfied') ? 'Not Satisfied' : 'Satisfied';
}

function isRequirementHeader(line: string): boolean {
    return /^.+\((?:R|RG)\d+(?:\/L\d+)?\)?$/.test(line.trim());
}

function parseRequirementHeader(line: string): { title: string; code: string | null } | null {
    const match = line.trim().match(/^(.+?)\s+\(((?:R|RG)\d+(?:\/L\d+)?)\)?$/);
    if (!match) return null;
    return {
        title: match[1].trim(),
        code: match[2].trim(),
    };
}

function parseCourseLine(line: string): AdvisementCourse | null {
    const courseMatch = line.match(new RegExp(
        `^(${TERM_PATTERN})\\s+([A-Z]{2,5})\\s+(\\d{3}[A-Z0-9]*)\\s+(.+?)\\s+([A-F][+-]?|W|IP|P|S|RINC)?\\s*(\\d+\\.\\d{2})\\s*(?:[A-Z]{2,5}\\s*)?$`,
        'i',
    ));

    if (!courseMatch) return null;

    const gradeCandidate = courseMatch[5]?.trim() || 'IP';
    const grade = gradeCandidate === 'RINC' ? 'IP' : gradeCandidate.toUpperCase();

    return {
        term: normalizeTerm(courseMatch[1]),
        course: normalizeCourseCode(courseMatch[2], courseMatch[3]),
        title: courseMatch[4].trim(),
        grade,
        units: parseFloat(courseMatch[6]) || 0,
        type: line.trim().split(/\s+/).at(-1),
    };
}

function parseMetric(line: string): AdvisementRequirementMetric | null {
    const metricMatch = line.match(
        /^(?:[\u0387\u2022]\s*)?(Units|Courses|GPA):\s*(?:(\d+(?:\.\d+)?)\s+required,\s*)?(?:(\d+(?:\.\d+)?)\s+completed)?(?:,\s*(\d+(?:\.\d+)?)\s+needed)?/i,
    );
    if (!metricMatch) return null;

    return {
        kind: metricMatch[1] as AdvisementRequirementMetric['kind'],
        required: parseNumber(metricMatch[2]),
        completed: parseNumber(metricMatch[3]),
        needed: parseNumber(metricMatch[4]),
    };
}

function parseCourseCodes(text: string): string[] {
    const matches = text.match(/\b[A-Z]{2,5}\s+\d{3}[A-Z0-9]*\b/g) || [];
    return [...new Set(matches.map(code => code.replace(/\s+/g, ' ').trim().toUpperCase()))];
}

function normalizeAdvisementLines(text: string): string[] {
    const sourceLines = text
        .split('\n')
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .filter(line => !/^Page \d+ of \d+$/i.test(line))
        .filter(line => !/^--- PAGE \d+ ---$/i.test(line));

    const rebuilt: string[] = [];

    for (let i = 0; i < sourceLines.length; i++) {
        const line = sourceLines[i];
        const nextLine = sourceLines[i + 1] || '';

        if (nextLine.match(/^\((?:R|RG)\d+(?:\/L\d+)?\)?$/)) {
            rebuilt.push(`${line} ${nextLine}`);
            i++;
            continue;
        }

        if (/^[\u0387\u2022]$/.test(line) && /^(Units|Courses|GPA):$/i.test(nextLine)) {
            const valueLine = sourceLines[i + 2] || '';
            rebuilt.push(`${line} ${nextLine} ${valueLine}`);
            i += 2;
            continue;
        }

        if (/^(Units|Courses|GPA):$/i.test(line) && sourceLines[i + 1]) {
            rebuilt.push(`${line} ${sourceLines[i + 1]}`);
            i++;
            continue;
        }

        if (
            /^[A-Za-z][A-Za-z0-9 &'()/-]+$/.test(line) &&
            TERM_ONLY_PATTERN.test(sourceLines[i + 1] || '') &&
            /^\d+\.\d{3}$/.test(sourceLines[i + 2] || '') &&
            /^\d+\.\d{3}$/.test(sourceLines[i + 3] || '') &&
            /^(Satisfied|Not Satisfied)$/i.test(sourceLines[i + 4] || '')
        ) {
            rebuilt.push(`${line} ${sourceLines[i + 1]} ${sourceLines[i + 2]} ${sourceLines[i + 3]} ${sourceLines[i + 4]}`);
            i += 4;
            continue;
        }

        if (
            /^[A-Za-z][A-Za-z0-9 &'()/-]+$/.test(line) &&
            /^\d+\.\d{2}$/.test(sourceLines[i + 1] || '') &&
            /^\d+\.\d{2}$/.test(sourceLines[i + 2] || '') &&
            /^\d+\.\d{2}$/.test(sourceLines[i + 3] || '') &&
            /^\d+\.\d{2}$/.test(sourceLines[i + 4] || '') &&
            /^(Satisfied|Not Satisfied)$/i.test(sourceLines[i + 5] || '')
        ) {
            rebuilt.push(`${line} ${sourceLines[i + 1]} ${sourceLines[i + 2]} ${sourceLines[i + 3]} ${sourceLines[i + 4]} ${sourceLines[i + 5]}`);
            i += 5;
            continue;
        }

        if (
            TERM_ONLY_PATTERN.test(line) &&
            SUBJECT_PATTERN.test(sourceLines[i + 1] || '') &&
            CATALOG_PATTERN.test(sourceLines[i + 2] || '')
        ) {
            const term = line;
            const subject = sourceLines[i + 1];
            const catalogNumber = sourceLines[i + 2];
            const titleParts: string[] = [];
            let grade = 'IP';
            let units = '';
            let type = '';
            let cursor = i + 3;

            while (cursor < sourceLines.length) {
                const token = sourceLines[cursor];
                const next = sourceLines[cursor + 1] || '';

                if (GRADE_PATTERN.test(token) && NUMBER_PATTERN.test(next)) {
                    grade = token;
                    units = next;
                    cursor += 2;
                    if (/^[A-Z]{2,6}$/.test(sourceLines[cursor] || '')) {
                        type = sourceLines[cursor];
                        cursor++;
                    }
                    break;
                }

                if (NUMBER_PATTERN.test(token)) {
                    units = token;
                    cursor++;
                    if (/^[A-Z]{2,6}$/.test(sourceLines[cursor] || '')) {
                        type = sourceLines[cursor];
                        cursor++;
                    }
                    break;
                }

                if (
                    TERM_ONLY_PATTERN.test(token) ||
                    isRequirementHeader(token) ||
                    /^Courses Available$/i.test(token) ||
                    /^Course History$/i.test(token)
                ) {
                    break;
                }

                titleParts.push(token);
                cursor++;
            }

            if (units && titleParts.length > 0) {
                rebuilt.push(`${term} ${subject} ${catalogNumber} ${titleParts.join(' ')} ${grade} ${units}${type ? ` ${type}` : ''}`);
                i = Math.max(i, cursor - 1);
                continue;
            }
        }

        rebuilt.push(line);
    }

    return rebuilt;
}

function extractStudentInfo(lines: string[]): AdvisementStudentInfo {
    let name: string | null = null;
    let studentId: string | null = null;
    let preparedOn: string | null = null;

    for (let i = 0; i < Math.min(lines.length, 30); i++) {
        const line = lines[i];
        const forMatch = line.match(/For\s+(.+?)\s+\((\d{6,12})\)\s+prepared on\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (forMatch) {
            name = forMatch[1].trim();
            studentId = forMatch[2];
            preparedOn = forMatch[3];
            break;
        }

        if (!name && line.toLowerCase() === 'for') {
            const studentLine = lines[i + 1] || '';
            const studentMatch = studentLine.match(/^(.+?)\s+\((\d{6,12})\)$/);
            if (studentMatch) {
                name = studentMatch[1].trim();
                studentId = studentMatch[2];
            }
        }

        if (!preparedOn && line.toLowerCase() === 'prepared on' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(lines[i + 1] || '')) {
            preparedOn = lines[i + 1];
        }

        if (!name && /^[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)+$/.test(line.trim()) && !/Academic Advisement Report/i.test(line)) {
            name = line.trim();
        } else if (!studentId && /^\d{6,12}$/.test(line.trim())) {
            studentId = line.trim();
        }
    }

    return { name, studentId, preparedOn };
}

function parseGpaRequirements(lines: string[]): AdvisementGpaRequirement[] {
    const results: AdvisementGpaRequirement[] = [];
    const rowPattern = new RegExp(`^(.+?)\\s+(${TERM_PATTERN})\\s+(\\d+\\.\\d{3})\\s+(\\d+\\.\\d{3})\\s+(Satisfied|Not Satisfied)$`, 'i');

    for (const line of lines) {
        const match = line.match(rowPattern);
        if (!match) continue;

        results.push({
            requirement: match[1].trim(),
            term: normalizeTerm(match[2]),
            actualGpa: parseNumber(match[3]),
            requiredGpa: parseNumber(match[4]),
            status: normalizeStatus(match[5]),
        });
    }

    return results;
}

function parseUnitRequirements(lines: string[]): AdvisementUnitRequirement[] {
    const results: AdvisementUnitRequirement[] = [];
    const rowPattern = /^(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(Satisfied|Not Satisfied)$/i;

    for (const line of lines) {
        const match = line.match(rowPattern);
        if (!match) continue;

        results.push({
            requirement: match[1].trim(),
            earned: parseNumber(match[2]),
            inProgress: parseNumber(match[3]),
            total: parseNumber(match[4]),
            required: parseNumber(match[5]),
            status: normalizeStatus(match[6]),
        });
    }

    return results;
}

function parseRequirementBlocks(lines: string[]): AdvisementRequirementBlock[] {
    const blocks: AdvisementRequirementBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
        const header = parseRequirementHeader(lines[i]);
        if (!header) continue;

        const content: string[] = [];
        let j = i + 1;
        while (j < lines.length && !isRequirementHeader(lines[j])) {
            content.push(lines[j]);
            j++;
        }

        const statusLine = content.find(line => /^(Satisfied|Not Satisfied):/i.test(line.trim()));
        const status = normalizeStatus(statusLine);
        const summary = (statusLine || '')
            .replace(/^(Satisfied|Not Satisfied):\s*/i, '')
            .trim();
        const metrics = content.map(parseMetric).filter((metric): metric is AdvisementRequirementMetric => Boolean(metric));
        const courses = content.map(parseCourseLine).filter((course): course is AdvisementCourse => Boolean(course));

        const availableIndex = content.findIndex(line => /^Courses Available$/i.test(line.trim()));
        const availableText = availableIndex >= 0 ? content.slice(availableIndex + 1).join(' ') : '';

        blocks.push({
            title: header.title,
            code: header.code,
            status,
            summary,
            metrics,
            courses,
            availableCourses: parseCourseCodes(availableText),
        });

        i = j - 1;
    }

    return blocks;
}

function parseCourseHistory(lines: string[]): AdvisementCourse[] {
    const historyStart = lines.findIndex(line => /^Course History$/i.test(line.trim()));
    if (historyStart < 0) return [];
    return lines
        .slice(historyStart + 1)
        .map(parseCourseLine)
        .filter((course): course is AdvisementCourse => Boolean(course));
}

export function parseAdvisementReportText(text: string): AdvisementReport {
    const lines = normalizeAdvisementLines(text);

    const requirementBlocks = parseRequirementBlocks(lines);

    return {
        student: extractStudentInfo(lines),
        gpaRequirements: parseGpaRequirements(lines),
        unitRequirements: parseUnitRequirements(lines),
        requirementBlocks,
        missingRequirements: requirementBlocks.filter(block => block.status === 'Not Satisfied'),
        courseHistory: parseCourseHistory(lines),
    };
}

export function getGraduationRequirementActions(report: AdvisementReport): GraduationRequirementAction[] {
    return report.missingRequirements
        .map(block => {
            const neededUnits = block.metrics
                .filter(metric => metric.kind === 'Units')
                .map(metric => metric.needed)
                .find(value => value !== null) ?? null;
            const neededCourses = block.metrics
                .filter(metric => metric.kind === 'Courses')
                .map(metric => metric.needed)
                .find(value => value !== null) ?? null;

            return {
                title: block.title,
                code: block.code,
                summary: block.summary,
                neededUnits,
                neededCourses,
                suggestedCourses: block.availableCourses,
                alreadyCounting: block.courses,
            };
        })
        .filter(action => (
            (action.neededUnits ?? 0) > 0 ||
            (action.neededCourses ?? 0) > 0 ||
            action.suggestedCourses.length > 0
        ));
}

export function buildAdvisementReportContext(report: AdvisementReport): string {
    const lines: string[] = [];
    const actions = getGraduationRequirementActions(report);

    lines.push('UPLOADED ACADEMIC ADVISEMENT REPORT');
    if (report.student.name) lines.push(`Student: ${report.student.name}`);
    if (report.student.studentId) lines.push(`Student ID: ${report.student.studentId}`);
    if (report.student.preparedOn) lines.push(`Report prepared: ${report.student.preparedOn}`);

    if (report.gpaRequirements.length) {
        lines.push('\nGPA REQUIREMENTS');
        for (const req of report.gpaRequirements) {
            lines.push(`- ${req.requirement}: ${req.actualGpa ?? 'unknown'} GPA / ${req.requiredGpa ?? 'unknown'} required (${req.status})`);
        }
    }

    if (report.unitRequirements.length) {
        lines.push('\nUNIT REQUIREMENTS');
        for (const req of report.unitRequirements) {
            const remaining = req.required !== null && req.total !== null ? Math.max(0, req.required - req.total) : null;
            lines.push(`- ${req.requirement}: ${req.total ?? 'unknown'} total, ${req.required ?? 'unknown'} required${remaining ? `, ${remaining} remaining` : ''} (${req.status})`);
        }
    }

    lines.push('\nACTIONABLE GRADUATION GAPS');
    if (!actions.length) {
        lines.push('- None found in the advisement report.');
    } else {
        for (const action of actions) {
            lines.push(`- ${action.title}${action.code ? ` (${action.code})` : ''}: ${action.summary || 'Not satisfied'}`);
            const needParts = [
                action.neededCourses !== null ? `${action.neededCourses} course(s) needed` : null,
                action.neededUnits !== null ? `${action.neededUnits} unit(s) needed` : null,
            ].filter(Boolean);
            if (needParts.length) lines.push(`  Need: ${needParts.join(', ')}`);
            if (action.alreadyCounting.length) {
                lines.push(`  Already counting: ${action.alreadyCounting.map(course => `${course.course} (${course.grade}, ${course.units} units)`).join(', ')}`);
            }
            if (action.suggestedCourses.length) {
                lines.push(`  Courses available: ${action.suggestedCourses.slice(0, 30).join(', ')}${action.suggestedCourses.length > 30 ? ', ...' : ''}`);
            }
        }
    }

    const parentUnsatisfied = report.missingRequirements.filter(block =>
        !actions.some(action => action.code === block.code)
    );
    if (parentUnsatisfied.length) {
        lines.push('\nPARENT REQUIREMENTS STILL MARKED NOT SATISFIED');
        for (const block of parentUnsatisfied) {
            lines.push(`- ${block.title}${block.code ? ` (${block.code})` : ''}: ${block.summary || 'Not satisfied'}`);
        }
    }

    if (report.courseHistory.length) {
        lines.push('\nCOURSE HISTORY');
        for (const course of report.courseHistory) {
            lines.push(`- ${course.term}: ${course.course} ${course.title} (${course.grade}, ${course.units} units)`);
        }
    }

    lines.push('\nAdvisor instruction: Use this advisement report as the source of truth for graduation gaps. Recommend courses from available course lists when present, respect needed units/course counts, and tell the student to confirm edge cases with their official advisor.');

    return lines.join('\n');
}
