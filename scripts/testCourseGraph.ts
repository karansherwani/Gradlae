// scripts/testCourseGraph.ts

import { CourseGraph } from '@/app/lib/courseGraph';
import { loadGraphCourses } from '@/app/lib/loadCourses';
import { CompletedCourse } from '../types';

const graph = new CourseGraph(loadGraphCourses());

console.log('🧪 Testing Course Graph\n');

// Test 1: Get course info
console.log('📚 Test 1: Get Course Info');
const ece101 = graph.getCourse('ECE-101');
console.log('ECE 101:', ece101?.title);
console.log('Prerequisites:', ece101?.prerequisites);
console.log('');

// Test 2: Check prerequisites with no completed courses
console.log('📋 Test 2: Check Prerequisites (No Completed Courses)');
const checkECE201 = graph.canTakeCourse('ECE-201', []);
console.log('Can take ECE 201?', checkECE201.eligible);
console.log('Missing:', checkECE201.missing);
console.log('');

// Test 3: Check prerequisites with completed courses
console.log('✅ Test 3: Check Prerequisites (With Completed Courses)');
const completedCourses: CompletedCourse[] = [
  {
    courseId: 'MATH-125',
    courseName: 'Calculus I',
    grade: 'A',
    units: 5,
    semester: 'Fall 2025',
    term: 'Fall',
    year: 2025
  },
  {
    courseId: 'ECE-101',
    courseName: 'Programming 1',
    grade: 'B',
    units: 4,
    semester: 'Fall 2025',
    term: 'Fall',
    year: 2025
  },
  {
    courseId: 'MATH-129',
    courseName: 'Calculus II',
    grade: 'A',
    units: 3,
    semester: 'Spring 2026',
    term: 'Spring',
    year: 2026
  }
];

const checkECE201Again = graph.canTakeCourse('ECE-201', completedCourses);
console.log('Can take ECE 201 now?', checkECE201Again.eligible);
console.log('Missing:', checkECE201Again.missing);
console.log('');

// Test 4: Get eligible courses
console.log('🎯 Test 4: Get Eligible Courses');
const eligible = graph.getEligibleCourses(completedCourses);
console.log(`Found ${eligible.length} eligible courses`);
console.log('First 10 eligible courses:');
eligible.slice(0, 10).forEach(course => {
  console.log(`  - ${course.id}: ${course.title}`);
});
console.log('');

// Test 5: Get prerequisite chain
console.log('🔗 Test 5: Prerequisite Chain');
const chain = graph.getPrerequisiteChain('ECE-369A');
console.log('Prerequisite chain for ECE-369A:');
chain.forEach((courseId, index) => {
  const course = graph.getCourse(courseId);
  console.log(`  ${index + 1}. ${courseId}: ${course?.title}`);
});
console.log('');

// Test 6: Search courses
console.log('🔍 Test 6: Search Courses');
const mlCourses = graph.searchCourses('machine learning', 5);
console.log('Courses matching "machine learning":');
mlCourses.forEach(course => {
  console.log(`  - ${course.id}: ${course.title}`);
});
console.log('');

// Test 7: Get courses by level
console.log('📊 Test 7: Upper Division CSC Courses');
const upperDivCSC = graph.getCoursesByLevel(300, 500, 'CSC');
console.log(`Found ${upperDivCSC.length} upper division CSC courses`);
console.log('First 10:');
upperDivCSC.slice(0, 10).forEach(course => {
  console.log(`  - ${course.id}: ${course.title}`);
});
console.log('');

// Test 8: Validate schedule
console.log('✔️  Test 8: Validate Schedule');
const proposedSchedule = ['ECE-201', 'PHYS-141', 'ENGL-102', 'MATH-243'];
const validation = graph.validateSchedule(proposedSchedule, completedCourses);
console.log('Valid?', validation.valid);
console.log('Total Units:', validation.totalUnits);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
console.log('');

// Test 9: Get unlocked courses
console.log('🔓 Test 9: Courses Unlocked by ECE-274A');
const unlocked = graph.getUnlockedCourses('ECE-274A', completedCourses);
console.log(`${unlocked.length} courses would be unlocked`);
console.log('First 5:');
unlocked.slice(0, 5).forEach(course => {
  console.log(`  - ${course.id}: ${course.title}`);
});
console.log('');

// Test 10: Statistics
console.log('📈 Test 10: Catalog Statistics');
const stats = graph.getStatistics();
console.log('Total Courses:', stats.totalCourses);
console.log('Courses with Prerequisites:', stats.withPrerequisites);
console.log('\nTop 5 Subjects:');
Object.entries(stats.bySubject)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .forEach(([subject, count]) => {
    console.log(`  ${subject}: ${count} courses`);
  });
console.log('\nBy Level:');
Object.entries(stats.byLevel).forEach(([level, count]) => {
  console.log(`  ${level}: ${count} courses`);
});
