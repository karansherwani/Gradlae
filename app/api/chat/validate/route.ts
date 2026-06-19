// app/api/chat/validate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { CourseGraph } from '@/app/lib/courseGraph';
import { Course, CompletedCourse } from '@/types';
import { loadGraphCourses } from '@/app/lib/loadCourses';
import { z } from 'zod';

function loadCourseData(): Course[] {
  return loadGraphCourses();
}

const validateScheduleSchema = z.object({
  courseIds: z.array(z.string().min(1).max(20)).min(1).max(20),
  completedCourses: z.array(z.object({
    courseId: z.string().max(20),
    courseName: z.string().max(200),
    grade: z.string().max(5),
    units: z.number().min(0).max(20),
  })).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const validation = validateScheduleSchema.safeParse(await request.json());
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return NextResponse.json(
        { error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Invalid request body' },
        { status: 400 },
      );
    }

    const { courseIds, completedCourses } = validation.data as {
      courseIds: string[];
      completedCourses: CompletedCourse[];
    };

    const courses = loadCourseData();
    const graph = new CourseGraph(courses);

    // Validate the schedule
    const scheduleValidation = graph.validateSchedule(courseIds, completedCourses);

    // Get details for each course
    const courseDetails = courseIds.map(id => {
      const course = graph.getCourse(id);
      const prereqCheck = graph.canTakeCourse(id, completedCourses);
      
      return {
        id,
        title: course?.title || 'Unknown',
        units: course?.units || { min: 0, max: 0 },
        eligible: prereqCheck.eligible,
        missing: prereqCheck.missingDetails
      };
    });

    return NextResponse.json({
      validation: scheduleValidation,
      courseDetails
    });

  } catch (error) {
    console.error('Validation API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
