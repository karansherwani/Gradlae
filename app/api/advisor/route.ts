// app/api/advisor/route.ts
// Real LLM-backed academic advisor that uses planner data + course catalog

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadAllCourses, Course as CSVCourse } from '@/app/lib/loadCourses';

// ─── DATA LOADING ──────────────────────────────────────────────────────────

interface PlannerData {
    plans: Array<{
        id: string;
        name: string;
        catalogYear: string;
        totalUnits: number;
        semesters: Array<{
            number: number;
            name: string;
            courses: Array<{
                courseId?: string;
                title?: string;
                category: string;
                electiveType?: string;
                options?: string[];
                units: number;
                prerequisites?: string;
            }>;
        }>;
        electiveCategories: Array<{
            id: string;
            name: string;
            requiredUnits: number;
            description?: string;
            eligibleCourses?: string[];
            rules?: string[];
        }>;
        notes?: string[];
    }>;
}

function loadPlannerData(): PlannerData {
    const plannerPath = path.join(process.cwd(), 'data', 'degreeRequirements.json');
    const data = fs.readFileSync(plannerPath, 'utf-8');
    return JSON.parse(data);
}

/**
 * Build a compact planner context for the AI prompt
 */
function buildPlannerContext(planner: PlannerData): string {
    const plan = planner.plans[0];
    if (!plan) return 'No degree plan data available.';

    const lines: string[] = [];
    lines.push(`DEGREE PLAN: ${plan.name}`);
    lines.push(`Catalog Year: ${plan.catalogYear} | Total Units: ${plan.totalUnits}`);
    lines.push('');

    for (const sem of plan.semesters) {
        const total = sem.courses.reduce((s, c) => s + c.units, 0);
        lines.push(`${sem.name} (${total} units):`);
        for (const c of sem.courses) {
            if (c.courseId) {
                lines.push(`  ${c.courseId}: ${c.title || '(untitled)'} (${c.units} units)${c.prerequisites ? ' | Prereqs: ' + c.prerequisites : ''}`);
            } else {
                lines.push(`  [Elective] ${c.electiveType || 'General'} (${c.units} units)${c.options ? ' | Options: ' + c.options.join(', ') : ''}`);
            }
        }
        lines.push('');
    }

    if (plan.electiveCategories?.length) {
        lines.push('ELECTIVE CATEGORIES:');
        for (const cat of plan.electiveCategories) {
            lines.push(`  ${cat.name}: ${cat.requiredUnits} units${cat.description ? ' - ' + cat.description : ''}`);
        }
        lines.push('');
    }

    if (plan.notes?.length) {
        lines.push('NOTES: ' + plan.notes.join('; '));
    }

    return lines.join('\n');
}

/**
 * Build a compact course catalog sample for the prompt.
 * We sample strategically to stay within token limits.
 */
function buildCourseSample(courses: CSVCourse[], maxCourses = 400): string {
    // Group by subject
    const bySubject: Record<string, CSVCourse[]> = {};
    for (const c of courses) {
        if (!bySubject[c.subject]) bySubject[c.subject] = [];
        bySubject[c.subject].push(c);
    }

    // Prioritize CS/ECE/MATH/ENGL/PHYS subjects and sample from others
    const priority = ['CSC', 'ECE', 'SFWE', 'MATH', 'ENGL', 'PHYS', 'CHEM', 'SIE'];
    const selected: CSVCourse[] = [];

    // Add all courses from priority subjects (undergrad level, catalog number < 500)
    for (const subj of priority) {
        const subjectCourses = bySubject[subj] || [];
        for (const c of subjectCourses) {
            const catNum = parseInt(c.catalogNumber);
            if (catNum >= 100 && catNum < 500) {
                selected.push(c);
            }
        }
    }

    // Fill remaining slots from other subjects
    const remaining = maxCourses - selected.length;
    if (remaining > 0) {
        const otherCourses = courses.filter(c => {
            const catNum = parseInt(c.catalogNumber);
            return !priority.includes(c.subject) && catNum >= 100 && catNum < 500;
        });
        // Take an even sampling
        const step = Math.max(1, Math.floor(otherCourses.length / remaining));
        for (let i = 0; i < otherCourses.length && selected.length < maxCourses; i += step) {
            selected.push(otherCourses[i]);
        }
    }

    // Format compactly
    const lines: string[] = [];
    const grouped: Record<string, CSVCourse[]> = {};
    for (const c of selected) {
        if (!grouped[c.subject]) grouped[c.subject] = [];
        grouped[c.subject].push(c);
    }

    for (const subj of Object.keys(grouped).sort()) {
        lines.push(`[${subj}]`);
        for (const c of grouped[subj].sort((a, b) => a.catalogNumber.localeCompare(b.catalogNumber))) {
            const units = c.minUnits === c.maxUnits
                ? `${c.minUnits}`
                : `${c.minUnits}-${c.maxUnits}`;
            const prereq = c.enrollmentRequirements && c.enrollmentRequirements !== '-'
                ? ` | Prereqs: ${c.enrollmentRequirements.substring(0, 80)}`
                : '';
            lines.push(`  ${c.subject} ${c.catalogNumber} | ${c.title} | ${units} units${prereq}`);
        }
    }

    return lines.join('\n');
}

/**
 * Build the system prompt
 */
function buildSystemPrompt(plannerContext: string, catalogSample: string): string {
    return `You are an AI academic advisor for students at the University of Arizona.
You have access to the student's degree plan and a sample of the course catalog.

${plannerContext}

AVAILABLE COURSE CATALOG (sample of relevant courses):
${catalogSample}

YOUR ROLE:
- Help students plan semesters, check prerequisites, and choose courses
- Generate personalized 4-year graduation plans
- Answer questions about degree requirements
- Be conversational, supportive, and encouraging

CONSTRAINTS:
- Maximum 21 credits per semester
- 12-18 credits recommended for full-time
- Always respect prerequisite chains
- Use plain text formatting (no markdown ** or ## etc.)
- Show degree plans in clear tabular format with course codes, titles, and units
- Always complete the entire plan in one response

When showing schedules use this format:
FALL 2025
---------
Course          | Title                              | Units
CSC 110         | Intro to Computer Programming      | 4
MATH 129        | Calculus II                        | 3
                                              Total:    7

Remember: Help students succeed and graduate on time!`;
}

// ─── API HANDLER ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, apiKey, studentContext } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            );
        }

        // Determine which API key to use
        const effectiveKey = apiKey || process.env.OPENAI_API_KEY || process.env.ROUTELLM_API_KEY;

        if (!effectiveKey) {
            return NextResponse.json(
                { error: 'No API key provided. Please enter your OpenAI API key in the advisor settings.' },
                { status: 401 }
            );
        }

        // Load data
        const plannerData = loadPlannerData();
        const allCourses = loadAllCourses();

        // Build context
        const plannerContext = buildPlannerContext(plannerData);
        const catalogSample = buildCourseSample(allCourses);

        // If the client provided student context (transcript info etc.), add it
        let studentInfo = '';
        if (studentContext) {
            studentInfo = `\n\nSTUDENT INFO:\n${studentContext}`;
        }

        const systemPrompt = buildSystemPrompt(plannerContext, catalogSample) + studentInfo;

        // Determine API endpoint
        const isRouteLLM = effectiveKey === process.env.ROUTELLM_API_KEY;
        const apiUrl = isRouteLLM
            ? 'https://routellm.abacus.ai/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${effectiveKey}`,
            },
            body: JSON.stringify({
                model: isRouteLLM ? 'gpt-4o' : 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map((m: { role: string; content: string }) => ({
                        role: m.role,
                        content: m.content,
                    })),
                ],
                temperature: 0.7,
                max_tokens: 4096,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('AI API error:', response.status, errText);

            if (response.status === 401) {
                return NextResponse.json(
                    { error: 'Invalid API key. Please check your OpenAI API key.' },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to get AI response' },
                { status: 502 }
            );
        }

        const data = await response.json();
        const aiMessage = data.choices?.[0]?.message?.content || 'No response from AI.';

        return NextResponse.json({ message: aiMessage });
    } catch (error) {
        console.error('Advisor API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
