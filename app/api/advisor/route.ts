// app/api/advisor/route.ts
// LLM-backed academic advisor – pulls planner + transcript from Supabase,
// falls back to static degreeRequirements.json if no DB planner exists.
// Uses Google Gemini (free tier) for AI responses.

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadAllCourses, Course as CSVCourse } from '@/app/lib/loadCourses';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { advisorRequestSchema, validateBody, sanitizeAIInput } from '@/app/lib/validation';

// ─── TYPES ─────────────────────────────────────────────────────────────────

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

interface TranscriptCourse {
    course: string;
    description: string;
    grade: string;
    credits: number;
    term: string;
    isRetake?: boolean;
    bestGrade?: string;
}

function inferAcademicFocusFromCourses(courses: TranscriptCourse[]): string[] {
    const counts = new Map<string, number>();
    for (const course of courses) {
        const subject = course.course?.trim().split(/\s+/)[0]?.toUpperCase();
        if (!subject) continue;
        counts.set(subject, (counts.get(subject) || 0) + 1);
    }

    const focusRules: Array<{ label: string; subjects: string[] }> = [
        { label: 'Statistics and Data Science', subjects: ['DATA', 'MATH', 'ISTA'] },
        { label: 'Computer Science', subjects: ['CSC', 'CSCV', 'ISTA'] },
        { label: 'Mathematics', subjects: ['MATH', 'STAT'] },
        { label: 'Engineering', subjects: ['ENGR', 'ECE', 'SIE', 'MSE', 'CHEE'] },
        { label: 'Natural Sciences', subjects: ['CHEM', 'PHYS', 'GEOS', 'BIOS', 'MCB', 'ECOL'] },
    ];

    return focusRules
        .map(rule => ({
            label: rule.label,
            score: rule.subjects.reduce((sum, subject) => sum + (counts.get(subject) || 0), 0),
        }))
        .filter(item => item.score >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.label);
}

function cleanEnv(value: string | undefined): string {
    return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

// ─── STATIC DATA LOADING (removed – see buildSystemPrompt null handling) ───


function buildPlannerContext(planner: PlannerData): string {
    const plan = planner.plans[0];
    if (!plan) return 'No degree plan data available.';

    const lines: string[] = [];
    lines.push(`DEGREE PLAN: ${plan.name}`);
    lines.push(`Catalog Year: ${plan.catalogYear} | Total Units Required: ${plan.totalUnits}`);
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

function buildCourseSample(courses: CSVCourse[], maxCourses = 400): string {
    const bySubject: Record<string, CSVCourse[]> = {};
    for (const c of courses) {
        if (!bySubject[c.subject]) bySubject[c.subject] = [];
        bySubject[c.subject].push(c);
    }

    const priority = ['CSC', 'ECE', 'SFWE', 'MATH', 'ENGL', 'PHYS', 'CHEM', 'SIE'];
    const selected: CSVCourse[] = [];

    for (const subj of priority) {
        const subjectCourses = bySubject[subj] || [];
        for (const c of subjectCourses) {
            const catNum = parseInt(c.catalogNumber);
            if (catNum >= 100 && catNum < 500) {
                selected.push(c);
            }
        }
    }

    const remaining = maxCourses - selected.length;
    if (remaining > 0) {
        const otherCourses = courses.filter(c => {
            const catNum = parseInt(c.catalogNumber);
            return !priority.includes(c.subject) && catNum >= 100 && catNum < 500;
        });
        const step = Math.max(1, Math.floor(otherCourses.length / remaining));
        for (let i = 0; i < otherCourses.length && selected.length < maxCourses; i += step) {
            selected.push(otherCourses[i]);
        }
    }

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

// ─── TRANSCRIPT CONTEXT (credit rules) ─────────────────────────────────────

function buildTranscriptContextFromDB(courses: TranscriptCourse[], studentName: string): string {
    // Filter out entries with missing course codes and W grades
    const passing = courses.filter(c => c.course && c.grade !== 'W' && c.grade !== 'IP');

    // De-duplicate by course code
    const seen = new Map<string, TranscriptCourse>();
    for (const c of passing) {
        const key = (c.course ?? '').trim().toUpperCase();
        if (key && !seen.has(key)) seen.set(key, c);
    }
    const uniqueCompleted = Array.from(seen.values());
    const earnedCredits = uniqueCompleted.reduce((s, c) => s + c.credits, 0);
    const inProgress = courses.filter(c => c.grade === 'IP');
    const ipCredits = inProgress.reduce((s, c) => s + c.credits, 0);

    const allTerms = [...new Set(courses.map(c => c.term))];
    const semesterCount = allTerms.length;

    let standing: string;
    if (earnedCredits >= 90) standing = 'Senior';
    else if (earnedCredits >= 60) standing = 'Junior';
    else if (earnedCredits >= 30) standing = 'Sophomore';
    else standing = 'Freshman';

    let ctx = `Name: ${studentName}\n`;
    ctx += `Completed Semesters: ${semesterCount}\n`;
    ctx += `Academic Standing: ${standing} (based on ${earnedCredits} earned credits)\n`;
    ctx += `Earned Credits: ${earnedCredits} (unique passed courses, excludes W and duplicate attempts)\n`;
    const inferredFocus = inferAcademicFocusFromCourses(courses);
    if (inferredFocus.length) {
        ctx += `Likely Academic Focus From Course History: ${inferredFocus.join(', ')}\n`;
    }
    if (ipCredits > 0) {
        ctx += `In-Progress Credits: ${ipCredits} (not counted in earned total)\n`;
    }
    ctx += `\nCOMPLETED COURSES (${uniqueCompleted.length} unique):\n`;
    for (const c of uniqueCompleted) {
        ctx += `  ${c.course}: ${c.description} (Grade: ${c.grade}, ${c.credits} cr, ${c.term})\n`;
    }
    if (inProgress.length > 0) {
        ctx += `\nIN-PROGRESS COURSES:\n`;
        for (const c of inProgress) {
            ctx += `  ${c.course}: ${c.description} (${c.credits} cr, ${c.term})\n`;
        }
    }

    return ctx;
}

// ─── SYSTEM PROMPT ─────────────────────────────────────────────────────────

function buildSystemPrompt(
    plannerContext: string | null,
    catalogSample: string,
    studentContext?: string,
): string {
    const hasStudentAcademicData = Boolean(studentContext?.trim());
    const hasAdvisementReport = Boolean(studentContext?.includes('UPLOADED ACADEMIC ADVISEMENT REPORT'));
    const hasCompletedCourses = Boolean(studentContext?.includes('COMPLETED COURSES') || studentContext?.includes('COURSE HISTORY'));
    const hasRequirementData = Boolean(studentContext?.includes('ACTIONABLE GRADUATION GAPS') || studentContext?.includes('GPA REQUIREMENTS'));

    let prompt = `You are an AI academic advisor for students at the University of Arizona.
You have access to a sample of the course catalog.

`;

    if (plannerContext) {
        prompt += `The student has a saved degree plan:\n${plannerContext}\n\n`;
    } else {
        prompt += `IMPORTANT: No specific degree plan has been saved for this student.
You do NOT have a pre-built semester-by-semester plan.
Do NOT invent or assume a fixed 8-semester schedule.
Instead, use the course catalog below and the student's transcript (if available)
to give personalized, dynamic advice. When asked what courses to take,
search the catalog for relevant courses based on the student's major,
completed coursework, remaining prerequisites, and interests.
If the student's uploaded data contains an advisement report, requirement names, GPA rows,
course history, or graduation gaps, infer the major/field from that data instead of asking
the student to repeat it.

`;
    }

    prompt += `AVAILABLE COURSE CATALOG (sample of relevant courses):
${catalogSample}

`;

    if (studentContext) {
        prompt += `STUDENT TRANSCRIPT AND ACADEMIC DATA:
${studentContext}

IMPORTANT CREDIT COUNTING RULES (already applied in the numbers above):
- Courses with a grade of W (withdrawal) do NOT count toward earned credits.
- If a course was taken multiple times, its credits are counted only ONCE.
- "Earned credits" means only unique, passed courses.
- In-progress courses are listed separately and are NOT included in earned credits.

`;
    } else {
        prompt += `NOTE: No transcript has been uploaded yet. You do NOT have the student's academic history.
If asked about specific credits, completed courses, or standing, let the student know
you need their transcript for accurate answers. Do not guess or assume.

`;
    }

    prompt += `YOUR ROLE:
- Help students plan semesters, check prerequisites, and choose courses
- Generate personalized graduation plans based on their ACTUAL transcript and interests
- Answer questions about degree requirements
- Be conversational, supportive, and encouraging
- Base all advice on the data provided above (transcript, catalog)
- If uploaded transcript/advisement data is present, do NOT say you lack access to it.
- If requirement names mention majors/minors (for example Statistics and Data Science, Mathematics, Computer Science), treat those as the student's academic fields.
- If course history is present, use those courses as completed/in-progress history. Do NOT say the student has 0 earned credits unless the supplied unit summary actually says 0.
- If you lack a specific detail that is not in the supplied data, ask only for that detail after using everything already provided.
- When you don't have any transcript, advisement report, saved planner, or requirement data, ask the student about their major and interests to give better advice

CONSTRAINTS:
- Maximum 21 credits per semester
- 12-18 credits recommended for full-time
- Always respect prerequisite chains
- Use plain text formatting (no markdown ** or ## etc.)
- Show degree plans in clear tabular format with course codes, titles, and units
- Always complete the entire plan in one response
- NEVER describe the student as a "senior" unless they truly have senior standing (120+ earned credits). Use the semester count and earned credits provided to determine standing.
- NEVER show a generic template plan. Always personalize based on actual student data.
- NEVER ask "what is your major?" when ${hasStudentAcademicData && (hasAdvisementReport || hasRequirementData || hasCompletedCourses) ? 'the uploaded context already contains academic data; infer from it and proceed.' : 'the answer is available in supplied student data.'}

When showing schedules use this format:
FALL 2025
---------
Course          | Title                              | Units
CSC 110         | Intro to Computer Programming      | 4
MATH 129        | Calculus II                        | 3
                                              Total:    7

Remember: Help students succeed and graduate on time!`;

    return prompt;
}

// ─── OPENAI-COMPATIBLE FALLBACKS ──────────────────────────────────────────

async function callOpenAICompatible(
    providerName: string,
    apiUrl: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
): Promise<string> {
    if (!apiKey) {
        throw new Error(`${providerName} API key is missing`);
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content,
                })),
            ],
            temperature: 0.7,
            max_tokens: 4096,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`${providerName} fallback error:`, errorText);
        throw new Error(`${providerName} AI service failed`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callConfiguredFallbacks(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
): Promise<string> {
    const providers = [
        {
            name: 'RouteLLM',
            key: cleanEnv(process.env.ROUTELLM_API_KEY),
            url: 'https://routellm.abacus.ai/v1/chat/completions',
            model: 'gpt-4o',
        },
        {
            name: 'OpenAI',
            key: cleanEnv(process.env.OPENAI_API_KEY),
            url: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini',
        },
    ].filter(provider => provider.key);

    if (providers.length === 0) {
        throw new Error('No fallback AI API key configured');
    }

    let lastError: unknown = null;
    for (const provider of providers) {
        try {
            console.log(`Using ${provider.name} fallback for advisor...`);
            return await callOpenAICompatible(
                provider.name,
                provider.url,
                provider.key,
                provider.model,
                systemPrompt,
                messages,
            );
        } catch (error) {
            lastError = error;
            console.warn(`${provider.name} fallback failed:`, error instanceof Error ? error.message : error);
        }
    }

    throw lastError instanceof Error ? lastError : new Error('All AI fallbacks failed');
}

// ─── API HANDLER ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input with Zod
        const validation = validateBody(advisorRequestSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            );
        }

        const { messages: rawMessages, studentContext: clientContext } = validation.data;

        // Sanitize user messages to mitigate prompt injection
        const messages = rawMessages.map(m => ({
            ...m,
            content: m.role === 'user' ? sanitizeAIInput(m.content) : m.content,
        }));

        // ─── Try to load from Supabase for authenticated users ──────────
        const contextParts: string[] = [];
        if (clientContext?.trim()) {
            contextParts.push(`CLIENT-UPLOADED CONTEXT:\n${clientContext.trim()}`);
        }
        let dbPlannerContext: string | null = null;
        let advisorUser: Awaited<ReturnType<typeof getUserFromRequest>> = null;

        advisorUser = await getUserFromRequest(request);
        if (advisorUser) {
            // Load transcript from Supabase
            const { data: transcript } = await supabaseAdmin
                .from('transcripts')
                .select('parsed_json')
                .eq('user_id', advisorUser.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (transcript?.parsed_json) {
                const parsed = transcript.parsed_json as { courses: TranscriptCourse[]; studentInfo?: { name?: string } };
                if (parsed.courses?.length > 0) {
                    const name = parsed.studentInfo?.name || advisorUser.name || 'Student';
                    contextParts.push(`SAVED TRANSCRIPT CONTEXT:\n${buildTranscriptContextFromDB(parsed.courses, name)}`);
                }
            }

            // Load planner from Supabase (if user has saved one)
            const { data: planner } = await supabaseAdmin
                .from('planners')
                .select('planner_json')
                .eq('user_id', advisorUser.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (planner?.planner_json) {
                dbPlannerContext = buildPlannerContext(planner.planner_json as PlannerData);
            }

        }

        const studentContext = contextParts.length ? contextParts.join('\n\n') : undefined;

        // Build context – use DB planner if available; otherwise tell the AI
        // to reason dynamically from transcript + catalog instead of a static template.
        const plannerContext = dbPlannerContext || null;
        const allCourses = loadAllCourses();
        const catalogSample = buildCourseSample(allCourses);

        const systemPrompt = buildSystemPrompt(plannerContext, catalogSample, studentContext);
        const lastMessage = messages[messages.length - 1];

        // ─── Try Gemini first, fall back to RouteLLM ─────────────────────
        const geminiKey = cleanEnv(
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
            process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY,
        );
        let aiMessage: string | null = null;

        if (geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                // Convert chat messages to Gemini format
                const geminiHistory = messages
                    .slice(0, -1)
                    .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
                    .map((m: { role: string; content: string }) => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }],
                    }));

                const chat = model.startChat({
                    history: [
                        { role: 'user', parts: [{ text: systemPrompt }] },
                        { role: 'model', parts: [{ text: 'Understood. I am ready to help as an AI academic advisor for University of Arizona students. I will follow all the guidelines and constraints provided.' }] },
                        ...geminiHistory,
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 4096,
                    },
                });

                const result = await chat.sendMessage(lastMessage.content);
                const response = result.response;
                aiMessage = response.text() || null;
            } catch (geminiError) {
                console.warn('Gemini API failed, falling back to RouteLLM:', (geminiError as Error).message);
                // aiMessage stays null → will trigger fallback below
            }
        }

        // ─── Fallback to RouteLLM if Gemini failed or key missing ────────
        if (!aiMessage) {
            try {
                aiMessage = await callConfiguredFallbacks(systemPrompt, messages);
            } catch (fallbackError) {
                console.error('All configured AI providers failed:', (fallbackError as Error).message);
                return NextResponse.json(
                    { error: 'AI advisor is not configured correctly. Add GEMINI_API_KEY or OPENAI_API_KEY in Vercel and redeploy.' },
                    { status: 503 }
                );
            }
        }

        const lastUserMsg = messages.filter((m: { role: string }) => m.role === 'user').pop();
        if (advisorUser && lastUserMsg) {
            void (async () => {
                try {
                    await supabaseAdmin
                        .from('advisor_sessions')
                        .insert({
                            user_id: advisorUser.id,
                            question: lastUserMsg.content?.substring(0, 2000) || '',
                            answer: aiMessage?.substring(0, 8000) || '',
                        });
                } catch { /* ignore logging errors */ }
            })();
        }

        return NextResponse.json({ message: aiMessage });
    } catch (error) {
        console.error('Advisor API error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403')) {
            return NextResponse.json(
                { error: 'AI service configuration error. Please contact support.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to get AI response. Please try again.' },
            { status: 500 }
        );
    }
}
