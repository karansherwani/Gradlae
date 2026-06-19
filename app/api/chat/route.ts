// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { CourseGraph } from '@/app/lib/courseGraph';
import { Course, StudentProfile, ChatMessage, DegreePlan } from '@/types';
import { chatRequestSchema, validateBody, sanitizeAIInput } from '@/app/lib/validation';
import { loadGraphCourses } from '@/app/lib/loadCourses';
import fs from 'fs';
import path from 'path';

// ─── DATA LOADING ────────────────────────────────────────────────────────────

let cachedDegreePlans: DegreePlan[] | null = null;

interface IntentCourseContext {
  id: string;
  title: string;
  units: Course['units'];
  eligible: boolean;
  missing: string[];
}

interface IntentContext {
  intent: 'general' | 'four_year_plan' | 'prerequisite_check' | 'recommendation' | 'schedule_planning' | 'degree_audit' | 'prerequisite_info';
  courses: IntentCourseContext[];
}

function loadCourseData(): Course[] {
  return loadGraphCourses();
}

function loadAllDegreePlans(): DegreePlan[] {
  if (cachedDegreePlans) return cachedDegreePlans;
  const dataPath = path.join(process.cwd(), 'data', 'degreeRequirements.json');
  const data = fs.readFileSync(dataPath, 'utf-8');
  cachedDegreePlans = JSON.parse(data).plans;
  return cachedDegreePlans!;
}

function loadDegreePlan(studentMajor?: string): DegreePlan {
  const plans = loadAllDegreePlans();
  if (studentMajor && plans.length > 1) {
    const majorLower = studentMajor.toLowerCase();
    const match = plans.find(p => p.name.toLowerCase().includes(majorLower));
    if (match) return match;
  }
  return plans[0]; // Default to first plan
}

// ─── SMART COURSE FILTERING ─────────────────────────────────────────────────

/**
 * Extract subject codes referenced in a degree plan
 */
function getDegreePlanSubjects(degreePlan: DegreePlan): Set<string> {
  const codes = new Set<string>();
  for (const sem of degreePlan.semesters) {
    for (const c of sem.courses) {
      if (c.courseId) codes.add(c.courseId.split('-')[0]);
      if (c.options) {
        for (const opt of c.options) codes.add(opt.split('-')[0]);
      }
    }
  }
  for (const cat of (degreePlan.electiveCategories || [])) {
    if (cat.eligibleCourses) {
      for (const ec of cat.eligibleCourses) codes.add(ec.split('-')[0]);
    }
  }
  return codes;
}

// Common general education subject codes at UofA
const GE_SUBJECTS = new Set([
  'ENGL', 'MATH', 'PHYS', 'CHEM', 'BIOL', 'HIST', 'PHIL', 'PSY',
  'SOC', 'ECON', 'POLS', 'SPAN', 'FREN', 'COMM', 'ART', 'MUS'
]);

/**
 * Filter the full course catalog to only courses relevant to the student
 */
function filterCoursesForMajor(
  allCourses: Course[],
  degreePlan: DegreePlan,
  studentProfile: StudentProfile
): Course[] {
  const planSubjects = getDegreePlanSubjects(degreePlan);

  // Collect all course IDs explicitly mentioned in the degree plan
  const planCourseIds = new Set<string>();
  for (const sem of degreePlan.semesters) {
    for (const c of sem.courses) {
      if (c.courseId) planCourseIds.add(c.courseId);
      if (c.options) c.options.forEach(o => planCourseIds.add(o));
    }
  }

  // Filter courses - include:
  // 1. Courses directly in the degree plan
  // 2. Courses from the same subject codes as the degree plan
  // 3. Common GE courses (undergrad level only, 100-400 level)
  // 4. Courses the student has completed (for context)
  const completedIds = new Set(studentProfile.completedCourses.map(c => c.courseId));

  const filtered = allCourses.filter(course => {
    const subjectCode = course.id.split('-')[0];
    const catalogNum = parseInt(course.id.split('-')[1] || '0');

    // Always include courses directly in the degree plan
    if (planCourseIds.has(course.id)) return true;

    // Include courses from degree plan subject codes (undergrad only: 100-499)
    if (planSubjects.has(subjectCode) && catalogNum >= 100 && catalogNum < 500) return true;

    // Include GE courses at 100-200 level only (keeps the list manageable)
    if (GE_SUBJECTS.has(subjectCode) && catalogNum >= 100 && catalogNum < 300) return true;

    // Include any courses the student has completed
    if (completedIds.has(course.id)) return true;

    return false;
  });

  // Cap at 600 courses to keep prompt within token limits
  return filtered.slice(0, 600);
}

/**
 * Build a compact text catalog of filtered courses for the AI prompt
 */
function buildCompactCourseCatalog(courses: Course[]): string {
  // Group by subject code for readability
  const bySubject: Record<string, Course[]> = {};
  for (const c of courses) {
    const subj = c.id.split('-')[0];
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push(c);
  }

  const lines: string[] = [];
  for (const subj of Object.keys(bySubject).sort()) {
    lines.push(`\n[${subj}]`);
    for (const c of bySubject[subj].sort((a, b) => a.id.localeCompare(b.id))) {
      const units = c.units.min === c.units.max
        ? `${c.units.min}`
        : `${c.units.min}-${c.units.max}`;

      // Extract prerequisite summary
      let prereqStr = '';
      if (c.prerequisites && c.prerequisites.type !== 'NONE') {
        prereqStr = c.prerequisites.raw || '';
        // Truncate long prereq strings
        if (prereqStr.length > 80) prereqStr = prereqStr.substring(0, 77) + '...';
        prereqStr = ` | Prereqs: ${prereqStr}`;
      }

      lines.push(`  ${c.id} | ${c.title} | ${units} units${prereqStr}`);
    }
  }

  return lines.join('\n');
}

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────

function buildSystemPrompt(
  studentProfile: StudentProfile,
  degreePlan: DegreePlan,
  eligibleCourses: Course[],
  filteredCatalog: string
): string {
  const completedCoursesList = studentProfile.completedCourses
    .map(c => `  ${c.courseId}: ${c.courseName} (Grade: ${c.grade}, ${c.units} units)`)
    .join('\n');

  const currentSemester = degreePlan.semesters.find(
    s => s.number === studentProfile.currentSemester
  );

  return `You are an AI academic advisor for ${studentProfile.major} students at the University of Arizona.

STUDENT PROFILE
---------------
Name: ${studentProfile.name}
Major: ${studentProfile.major}
${studentProfile.minor ? `Minor: ${studentProfile.minor}` : ''}
Current Semester: ${studentProfile.currentSemester} (${currentSemester?.name || 'Unknown'})
Start: ${studentProfile.startTerm} ${studentProfile.startYear}
Interests: ${studentProfile.interests?.join(', ') || 'Not specified'}
Career Goals: ${studentProfile.careerGoals || 'Not specified'}

COMPLETED COURSES (${studentProfile.completedCourses.length} courses, ${studentProfile.completedCourses.reduce((sum, c) => sum + c.units, 0)} units)
${completedCoursesList || 'None yet'}

DEGREE REQUIREMENTS
-------------------
Degree: ${degreePlan.name}
Total Units Required: ${degreePlan.totalUnits}
Catalog Year: ${degreePlan.catalogYear}

ELIGIBLE COURSES
The student is currently eligible to take ${eligibleCourses.length} courses based on completed prerequisites.

FULL 4-YEAR DEGREE PLAN (Semester-by-Semester)
-----------------------------------------------
${degreePlan.semesters.map(sem => {
    const courseLines = sem.courses.map(c => {
      if (c.courseId) {
        const completed = studentProfile.completedCourses.some(cc => cc.courseId === c.courseId);
        const status = completed ? '[COMPLETED]' : '[PENDING]';
        const prereqs = c.prerequisites ? ` | Prerequisites: ${c.prerequisites}` : '';
        const options = c.options && c.options.length > 1 ? ` | Options: ${c.options.join(', ')}` : '';
        return `  ${status} ${c.courseId}: ${c.title} (${c.units} units)${prereqs}${options}`;
      } else {
        return `  [ELECTIVE] ${c.electiveType} (${c.units} units)${c.options ? ' | Options: ' + c.options.join(', ') : ''}`;
      }
    }).join('\n');
    const semesterTotal = sem.courses.reduce((sum, c) => sum + c.units, 0);
    return `${sem.name} (${semesterTotal} units):\n${courseLines}\n  --- Semester Total: ${semesterTotal} units`;
  }).join('\n\n')}

PRE-COMPUTED CREDIT SUMMARY (USE THESE EXACT NUMBERS)
-----------------------------------------------------
${degreePlan.semesters.map(sem => {
    const semesterTotal = sem.courses.reduce((sum, c) => sum + c.units, 0);
    return `${sem.name}: ${semesterTotal} units`;
  }).join('\n')}
Grand Total: ${degreePlan.semesters.reduce((total, sem) => total + sem.courses.reduce((sum, c) => sum + c.units, 0), 0)} units

Student Completed Units: ${studentProfile.completedCourses.reduce((sum, c) => sum + c.units, 0)} units
Remaining Units: ${degreePlan.semesters.reduce((total, sem) => total + sem.courses.reduce((sum, c) => sum + c.units, 0), 0) - studentProfile.completedCourses.reduce((sum, c) => sum + c.units, 0)} units (approximate)

ELECTIVE CATEGORIES
-------------------
${degreePlan.electiveCategories.map(cat => {
    let info = `${cat.name}: ${cat.requiredUnits} units required`;
    if (cat.description) info += ` - ${cat.description}`;
    if (cat.eligibleCourses) info += ` | Eligible: ${cat.eligibleCourses.join(', ')}`;
    if (cat.rules) info += ` | Rules: ${cat.rules.join('; ')}`;
    return `  ${info}`;
  }).join('\n')}

${degreePlan.notes ? `DEGREE NOTES: ${degreePlan.notes.join('; ')}` : ''}

AVAILABLE COURSE CATALOG (Filtered for ${studentProfile.major})
---------------------------------------------------------------
The following courses are available at the University of Arizona that are relevant to this major.
Use these to verify course IDs, titles, units, and prerequisites when building plans.
${filteredCatalog}

4-YEAR PLAN GENERATION INSTRUCTIONS
------------------------------------
When a student asks you to create a 4-year plan, generate a graduation plan, or asks about planning for a specific major:
1. Use the FULL 4-YEAR DEGREE PLAN above as the reference template
2. Check which courses the student has already completed and mark them
3. Start from the student's current semester and plan forward
4. Adjust the plan based on courses already completed (they can skip those semesters' courses)
5. If the student asks about a DIFFERENT major, explain that the plan above is for ${degreePlan.name} and provide what information you can, but recommend they consult an advisor for other majors
6. Show the plan in a clear semester-by-semester format with course codes, titles, and units
7. Include total units per semester and highlight any prerequisites
8. Look up actual course information from the AVAILABLE COURSE CATALOG to verify course IDs and units

HARD CONSTRAINTS
----------------
1. Maximum 21 credits per semester - NEVER exceed this limit
2. Minimum 12 credits per semester for full-time status (warn if below)
3. Recommended range: 14-17 credits per semester for best balance
4. Some courses may only be offered in Fall or Spring - note this when known
5. Always respect prerequisite chains - a student cannot take a course before completing its prerequisites
6. Summer semesters are optional and typically 3-9 credits

CRITICAL MATH RULES
-------------------
1. ALWAYS add up the actual units from each course listed in each semester - NEVER estimate or round
2. The per-semester total MUST equal the sum of units of all courses listed in that semester
3. The grand total MUST equal the sum of all per-semester totals
4. Use the PRE-COMPUTED CREDIT SUMMARY above as your source of truth for unit counts
5. Double-check your arithmetic before stating any totals
6. When generating a personalized plan, re-sum the units for the specific courses you include
7. After listing all semesters, add up each semester total to compute the Grand Total and verify it matches

YOUR ROLE
---------
You are a helpful, knowledgeable academic advisor. You should:
1. Answer questions about courses, prerequisites, degree requirements, and graduation planning
2. Recommend courses based on what the student has completed and their degree requirements
3. Validate schedules - check if proposed courses are eligible and reasonable (12-18 units)
4. Provide degree audits - track progress toward graduation
5. Generate personalized 4-year graduation plans based on the degree plan data
6. Be conversational and supportive

CRITICAL FORMATTING RULES - YOU MUST FOLLOW THESE EXACTLY
----------------------------------------------------------
1. DO NOT use any markdown formatting like **, *, ##, ###, ---, or backticks
2. DO NOT use asterisks around text for emphasis
3. Use PLAIN TEXT only - no special formatting characters
4. ALWAYS generate the COMPLETE plan - do not stop early or say "continued in next message"
5. If the plan is long, that is fine - include ALL semesters in one response

When showing a degree plan or course schedule, format it EXACTLY like this example:

FALL 2024
---------
Course          | Title                              | Units
CSC 110         | Intro to Computer Programming      | 4
MATH 129        | Calculus II                        | 3
ENGL 102        | First-Year Composition             | 3
GE Core         | General Education Elective         | 3
                                              Total:    13

SPRING 2025
-----------
Course          | Title                              | Units
CSC 120         | Data Structures                    | 4
CSC 245         | Discrete Structures                | 3
PHYS 141        | Introductory Mechanics             | 4
                                              Total:    11

PLAN SUMMARY
------------
Semesters Remaining: X
Total Credits in Plan: YYY (sum of all semester totals above)

For prerequisites, format like this:
  CSC 210 requires: CSC 120 (completed), CSC 245 (completed)
  Status: Eligible to enroll

For course recommendations, format like this:
  Recommended Courses for Next Semester:

  1. CSC 210 - Software Development (4 units)
     Prerequisites: CSC 120, CSC 245
     Why: Core requirement, unlocks many upper-division courses

  2. MATH 313 - Linear Algebra (3 units)
     Prerequisites: MATH 129
     Why: Required for data science track

RESPONSE GUIDELINES
-------------------
- Keep responses concise but thorough
- Use clear section headers with dashes underneath
- Use numbered lists for recommendations
- Always check prerequisites before recommending courses
- Warn if a semester exceeds 18 units (heavy) or is below 12 units (light)
- NEVER exceed 21 credits in any semester
- Mention if a course unlocks important future courses
- Be encouraging and positive
- If unsure, suggest they confirm with their faculty advisor
- ALWAYS complete the ENTIRE plan in a single response - never truncate

Remember: Help students succeed and graduate on time!`;
}

// ─── API HANDLER ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateBody(chatRequestSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { messages: rawMessages, studentProfile: rawProfile } = validation.data;

    // Cast validated data — Zod ensures shape; extra fields (id, timestamp) are client-only
    const studentProfile = rawProfile as unknown as StudentProfile;

    // Sanitize all user messages to mitigate prompt injection
    const sanitizedMessages = rawMessages.map(m => ({
      ...m,
      content: m.role === 'user' ? sanitizeAIInput(m.content) : m.content,
    })) as unknown as ChatMessage[];
    const messages = sanitizedMessages;

    // Load data
    const courses = loadCourseData();
    const degreePlan = loadDegreePlan(studentProfile.major);
    const graph = new CourseGraph(courses);

    // Get eligible courses
    const eligibleCourses = graph.getEligibleCourses(studentProfile.completedCourses);

    // Filter course catalog to relevant courses
    const filteredCourses = filterCoursesForMajor(courses, degreePlan, studentProfile);
    const compactCatalog = buildCompactCourseCatalog(filteredCourses);

    // Build system prompt with filtered catalog
    const systemPrompt = buildSystemPrompt(studentProfile, degreePlan, eligibleCourses, compactCatalog);

    // Get the last user message
    const lastMessage = messages[messages.length - 1];

    // Detect intent and gather context
    const context = analyzeUserIntent(lastMessage.content, graph, studentProfile);

    // Call AI API (using Abacus.AI RouteLLM or OpenAI)
    const aiResponse = await callAI(systemPrompt, messages, context);

    return NextResponse.json({
      message: aiResponse,
      context: context
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── INTENT ANALYSIS ─────────────────────────────────────────────────────────

function analyzeUserIntent(
  userMessage: string,
  graph: CourseGraph,
  studentProfile: StudentProfile
): IntentContext {
  const lowerMessage = userMessage.toLowerCase();
  const context: IntentContext = {
    intent: 'general',
    courses: []
  };

  // Extract course codes from message (e.g., "ECE 101", "CSC-355")
  const courseMatches = userMessage.match(/([A-Z]{2,5})[\s-]?(\d{3}[A-Z]*)/gi);
  if (courseMatches) {
    context.courses = courseMatches.flatMap(match => {
      const normalized = match.replace(/\s+/g, '-').toUpperCase();
      const course = graph.getCourse(normalized);
      if (course) {
        const prereqCheck = graph.canTakeCourse(normalized, studentProfile.completedCourses);
        return {
          id: course.id,
          title: course.title,
          units: course.units,
          eligible: prereqCheck.eligible,
          missing: prereqCheck.missing
        };
      }
      return [];
    });
  }

  // Detect intent
  if (lowerMessage.includes('4 year') || lowerMessage.includes('four year') || lowerMessage.includes('4-year') || lowerMessage.includes('degree plan') || lowerMessage.includes('graduation plan') || lowerMessage.includes('plan for')) {
    context.intent = 'four_year_plan';
  } else if (lowerMessage.includes('can i take') || lowerMessage.includes('eligible')) {
    context.intent = 'prerequisite_check';
  } else if (lowerMessage.includes('recommend') || lowerMessage.includes('should i take') || lowerMessage.includes('what courses')) {
    context.intent = 'recommendation';
  } else if (lowerMessage.includes('schedule') || lowerMessage.includes('next semester')) {
    context.intent = 'schedule_planning';
  } else if (lowerMessage.includes('graduate') || lowerMessage.includes('degree audit') || lowerMessage.includes('progress')) {
    context.intent = 'degree_audit';
  } else if (lowerMessage.includes('prerequisite') || lowerMessage.includes('prereq')) {
    context.intent = 'prerequisite_info';
  }

  return context;
}

// ─── AI API CALL ─────────────────────────────────────────────────────────────

async function callAI(
  systemPrompt: string,
  messages: ChatMessage[],
  context: IntentContext
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ROUTELLM_API_KEY;

  if (!apiKey) {
    return "I'm currently unable to connect to the AI service. Please make sure your API key is configured.";
  }

  // Use OpenAI API (or RouteLLM with same interface)
  const apiUrl = process.env.ROUTELLM_API_KEY
    ? 'https://routellm.abacus.ai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.ROUTELLM_API_KEY ? 'gpt-4o' : 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        // Add context as a system message
        {
          role: 'system',
          content: `Additional context: ${JSON.stringify(context)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI API Error:', error);
    throw new Error('Failed to get AI response');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
