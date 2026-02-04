// app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { CourseGraph } from '@/app/lib/courseGraph';
import { Course, StudentProfile, ChatMessage, DegreePlan } from '@/types';
import fs from 'fs';
import path from 'path';

// Load course data (in production, use a database)
function loadCourseData(): Course[] {
  const dataPath = path.join(process.cwd(), 'data', 'courses.json');
  const data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data);
}

// Load degree plan
function loadDegreePlan(): DegreePlan {
  const dataPath = path.join(process.cwd(), 'data', 'degreeRequirements.json');
  const data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data).plans[0];
}

// Build AI context/prompt
function buildSystemPrompt(
  studentProfile: StudentProfile,
  degreePlan: DegreePlan,
  eligibleCourses: Course[]
): string {
  const completedCoursesList = studentProfile.completedCourses
    .map(c => `- ${c.courseId}: ${c.courseName} (Grade: ${c.grade}, ${c.units} units)`)
    .join('\n');

  const currentSemester = degreePlan.semesters.find(
    s => s.number === studentProfile.currentSemester
  );

  return `You are an AI academic advisor for ${studentProfile.major} students at the University of Arizona.

# Student Profile
- Name: ${studentProfile.name}
- Major: ${studentProfile.major}
${studentProfile.minor ? `- Minor: ${studentProfile.minor}` : ''}
- Current Semester: ${studentProfile.currentSemester} (${currentSemester?.name || 'Unknown'})
- Start: ${studentProfile.startTerm} ${studentProfile.startYear}

# Completed Courses (${studentProfile.completedCourses.length} courses, ${studentProfile.completedCourses.reduce((sum, c) => sum + c.units, 0)} units)
${completedCoursesList || 'None yet'}

# Degree Requirements
- Degree: ${degreePlan.name}
- Total Units Required: ${degreePlan.totalUnits}
- Catalog Year: ${degreePlan.catalogYear}

# Current Semester Plan (Semester ${studentProfile.currentSemester})
${currentSemester?.courses.map(c => 
  c.courseId 
    ? `- ${c.courseId}: ${c.title} (${c.units} units)${c.prerequisites ? ` - Prereq: ${c.prerequisites}` : ''}`
    : `- ${c.electiveType} (${c.units} units)`
).join('\n') || 'No courses planned'}

# Eligible Courses
The student is currently eligible to take ${eligibleCourses.length} courses based on completed prerequisites.

# Your Role
You are a helpful, knowledgeable academic advisor. You should:

1. **Answer questions** about courses, prerequisites, degree requirements, and graduation planning
2. **Recommend courses** based on:
   - What the student has completed
   - What's required for their degree
   - Their interests and career goals
   - Prerequisite chains and optimal sequencing
3. **Validate schedules** - check if proposed courses are eligible and reasonable (12-18 units)
4. **Provide degree audits** - track progress toward graduation
5. **Be conversational and supportive** - students may be stressed or confused
6. **Cite specific courses** using format: SUBJ-NUM (e.g., ECE-101, MATH-129)

# Important Guidelines
- Always check prerequisites before recommending a course
- Warn about heavy workloads (>16 units) or light loads (<12 units)
- Mention if a course unlocks important future courses
- Consider the student's interests: ${studentProfile.interests?.join(', ') || 'Not specified'}
- Career goals: ${studentProfile.careerGoals || 'Not specified'}
- Be encouraging and positive
- If you're unsure, say so and suggest they confirm with their faculty advisor

# Response Style
- Be concise but thorough
- Use bullet points for lists
- Highlight course codes in **bold** (e.g., **ECE-101**)
- Use emojis sparingly for emphasis (✅ ❌ 📚 🎯)

Remember: You're here to help students succeed and graduate on time!`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      messages, 
      studentProfile 
    }: { 
      messages: ChatMessage[]; 
      studentProfile: StudentProfile;
    } = body;

    // Validate input
    if (!messages || !studentProfile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load data
    const courses = loadCourseData();
    const degreePlan = loadDegreePlan();
    const graph = new CourseGraph(courses);

    // Get eligible courses
    const eligibleCourses = graph.getEligibleCourses(studentProfile.completedCourses);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(studentProfile, degreePlan, eligibleCourses);

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

/**
 * Analyze user intent and gather relevant context
 */
function analyzeUserIntent(
  userMessage: string,
  graph: CourseGraph,
  studentProfile: StudentProfile
): any {
  const lowerMessage = userMessage.toLowerCase();
  const context: any = {
    intent: 'general',
    courses: []
  };

  // Extract course codes from message (e.g., "ECE 101", "CSC-355")
  const courseMatches = userMessage.match(/([A-Z]{2,5})[\s-]?(\d{3}[A-Z]*)/gi);
  if (courseMatches) {
    context.courses = courseMatches.map(match => {
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
      return null;
    }).filter(Boolean);
  }

  // Detect intent
  if (lowerMessage.includes('can i take') || lowerMessage.includes('eligible')) {
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

/**
 * Call AI API (OpenAI, Anthropic, or Abacus.AI RouteLLM)
 */
async function callAI(
  systemPrompt: string,
  messages: ChatMessage[],
  context: any
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
      max_tokens: 1000
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