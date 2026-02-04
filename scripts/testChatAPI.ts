// scripts/testChatAPI.ts

import { StudentProfile, ChatMessage } from '../types';

const API_BASE_URL = 'http://localhost:3000';

/**
 * Test the chat API
 */
async function testChatAPI() {
  console.log('🧪 Testing Chat API\n');

  // Sample student profile
  const studentProfile: StudentProfile = {
    name: 'Alex Johnson',
    email: 'alex@email.arizona.edu',
    studentId: '123456789',
    major: 'B.S. in Computer Science and Engineering',
    minor: 'Mathematics',
    currentSemester: 3,
    startTerm: 'Fall',
    startYear: 2024,
    expectedGraduation: { term: 'Spring', year: 2028 },
    completedCourses: [
      {
        courseId: 'MATH-125',
        courseName: 'Calculus I',
        grade: 'A',
        units: 4,
        semester: 'Fall 2024',
        term: 'Fall',
        year: 2024
      },
      {
        courseId: 'ECE-101',
        courseName: 'Programming 1',
        grade: 'B',
        units: 3,
        semester: 'Fall 2024',
        term: 'Fall',
        year: 2024
      },
      {
        courseId: 'ENGL-101',
        courseName: 'English Composition',
        grade: 'A',
        units: 3,
        semester: 'Fall 2024',
        term: 'Fall',
        year: 2024
      },
      {
        courseId: 'MATH-129',
        courseName: 'Calculus II',
        grade: 'B',
        units: 4,
        semester: 'Spring 2025',
        term: 'Spring',
        year: 2025
      },
      {
        courseId: 'PHYS-141',
        courseName: 'Introductory Mechanics',
        grade: 'A',
        units: 4,
        semester: 'Spring 2025',
        term: 'Spring',
        year: 2025
      }
    ],
    interests: ['Artificial Intelligence', 'Web Development', 'Cybersecurity'],
    careerGoals: 'Software Engineer at a tech company'
  };

  // Test 1: Simple question
  console.log('📝 Test 1: Simple Question');
  const test1Messages: ChatMessage[] = [
    {
      role: 'user',
      content: 'What courses should I take next semester?'
    }
  ];

  try {
    const response1 = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: test1Messages,
        studentProfile
      })
    });

    if (!response1.ok) {
      throw new Error(`API returned ${response1.status}: ${await response1.text()}`);
    }

    const data1 = await response1.json();
    console.log('✅ Response:', data1.message);
    console.log('📊 Context:', data1.context);
    console.log('');
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    console.log('');
  }

  // Test 2: Prerequisite check
  console.log('📝 Test 2: Prerequisite Check');
  const test2Messages: ChatMessage[] = [
    {
      role: 'user',
      content: 'Can I take ECE-369A next semester?'
    }
  ];

  try {
    const response2 = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: test2Messages,
        studentProfile
      })
    });

    const data2 = await response2.json();
    console.log('✅ Response:', data2.message);
    console.log('📊 Context:', data2.context);
    console.log('');
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    console.log('');
  }

  // Test 3: Course search
  console.log('📝 Test 3: Course Search API');
  try {
    const response3 = await fetch(
      `${API_BASE_URL}/api/courses/search?q=machine+learning&limit=5`
    );

    const data3 = await response3.json();
    console.log(`✅ Found ${data3.courses.length} courses:`);
    data3.courses.forEach((course: any) => {
      console.log(`  - ${course.id}: ${course.title}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    console.log('');
  }

  // Test 4: Schedule validation
  console.log('📝 Test 4: Schedule Validation API');
  try {
    const response4 = await fetch(`${API_BASE_URL}/api/chat/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseIds: ['ECE-201', 'PHYS-241', 'ENGL-102', 'ECE-274A'],
        completedCourses: studentProfile.completedCourses
      })
    });

    const data4 = await response4.json();
    console.log('✅ Validation Result:');
    console.log(`  Valid: ${data4.validation.valid}`);
    console.log(`  Total Units: ${data4.validation.totalUnits}`);
    console.log(`  Errors: ${data4.validation.errors.length}`);
    data4.validation.errors.forEach((err: string) => {
      console.log(`    - ${err}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Test 4 failed:', error);
    console.log('');
  }

  console.log('✨ All tests complete!\n');
}

// Run tests
testChatAPI().catch(console.error);