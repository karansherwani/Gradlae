// app/api/chat/validate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { CourseGraph } from '@/app/lib/courseGraph';
import { Course, CompletedCourse } from '@/types';
import { loadGraphCourses } from '@/app/lib/loadCourses';

function loadCourseData(): Course[] {
  return loadGraphCourses();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      courseIds, 
      completedCourses 
    }: { 
      courseIds: string[]; 
      completedCourses: CompletedCourse[];
    } = body;

    const courses = loadCourseData();
    const graph = new CourseGraph(courses);

    // Validate the schedule
    const validation = graph.validateSchedule(courseIds, completedCourses);

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
      validation,
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
