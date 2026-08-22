// app/api/courses/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { CourseGraph } from '@/app/lib/courseGraph';
import { Course } from '@/types';
import { loadGraphCourses } from '@/app/lib/loadCourses';

function loadCourseData(): Course[] {
  return loadGraphCourses();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const subject = searchParams.get('subject');
    const minLevel = searchParams.get('minLevel');
    const maxLevel = searchParams.get('maxLevel');
    const limit = parseInt(searchParams.get('limit') || '20');

    const courses = loadCourseData();
    const graph = new CourseGraph(courses);

    let results: Course[] = [];

    if (query) {
      results = graph.searchCourses(query, limit);
    } else if (subject && minLevel && maxLevel) {
      results = graph.getCoursesByLevel(
        parseInt(minLevel),
        parseInt(maxLevel),
        subject
      ).slice(0, limit);
    } else if (subject) {
      results = graph.getCoursesBySubject(subject).slice(0, limit);
    } else {
      return NextResponse.json(
        { error: 'Missing search parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json({ courses: results });

  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
