// scripts/debugEnrollmentReqs.ts

import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvContent = fs.readFileSync('courses-report.2026-01-15.csv', 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true
});

console.log('🔍 Analyzing Enrollment Requirements\n');

// Get unique enrollment requirement values
const enrollmentReqs = new Map<string, number>();

records.forEach((row: any) => {
  const req = row['Enrollment Requirements']?.trim();
  if (req && req !== '-') {
    enrollmentReqs.set(req, (enrollmentReqs.get(req) || 0) + 1);
  }
});

console.log(`Found ${enrollmentReqs.size} unique enrollment requirement codes\n`);

// Show top 20 most common codes
console.log('Top 20 most common enrollment requirement codes:');
Array.from(enrollmentReqs.entries())
  .sort(([, a], [, b]) => b - a)
  .slice(0, 20)
  .forEach(([code, count]) => {
    console.log(`  ${code}: ${count} courses`);
  });

// Check if Course Requisites ever has useful data
console.log('\n\n🔍 Checking Course Requisites column for non-empty values:\n');

const nonEmptyRequisites = records.filter((row: any) => {
  const req = row['Course Requisites']?.trim();
  return req && req !== '-';
});

console.log(`Found ${nonEmptyRequisites.length} courses with non-empty Course Requisites\n`);

if (nonEmptyRequisites.length > 0) {
  console.log('Sample courses with Course Requisites:');
  nonEmptyRequisites.slice(0, 10).forEach((row: any) => {
    console.log(`\n${row['Subject code']}-${row['Catalog Number']}: ${row['Course Title']}`);
    console.log(`  Course Requisites: "${row['Course Requisites']}"`);
  });
}

// Look for courses that mention prerequisites in the description
console.log('\n\n🔍 Checking Course Descriptions for prerequisite mentions:\n');

const withPrereqInDesc = records.filter((row: any) => {
  const desc = row['Course Description']?.toLowerCase() || '';
  return desc.includes('prerequisite') || desc.includes('prereq');
});

console.log(`Found ${withPrereqInDesc.length} courses mentioning prerequisites in description\n`);

if (withPrereqInDesc.length > 0) {
  console.log('Sample courses with prerequisites in description:');
  withPrereqInDesc.slice(0, 5).forEach((row: any) => {
    console.log(`\n${row['Subject code']}-${row['Catalog Number']}: ${row['Course Title']}`);
    const desc = row['Course Description'] || '';
    const prereqMatch = desc.match(/[Pp]rerequisite[s]?:?[^.]+\./);
    if (prereqMatch) {
      console.log(`  ${prereqMatch[0]}`);
    }
  });
}

// Check specific CSC/ECE courses we know should have prerequisites
console.log('\n\n🔍 Checking specific courses that should have prerequisites:\n');

const testCourses = [
  { subject: 'CSC', catalog: '355' },
  { subject: 'CSC', catalog: '335' },
  { subject: 'ECE', catalog: '369A' },
  { subject: 'MATH', catalog: '129' },
  { subject: 'PHYS', catalog: '241' }
];

testCourses.forEach(({ subject, catalog }) => {
  const course = records.find((row: any) => 
    row['Subject code'] === subject && row['Catalog Number'] === catalog
  );
  
  if (course) {
    console.log(`\n${subject}-${catalog}: ${course['Course Title']}`);
    console.log(`  Course Requisites: "${course['Course Requisites']}"`);
    console.log(`  Enrollment Requirements: "${course['Enrollment Requirements']}"`);
    
    const desc = course['Course Description'] || '';
    const prereqMatch = desc.match(/[Pp]rerequisite[s]?:?[^.]+\./);
    if (prereqMatch) {
      console.log(`  From Description: ${prereqMatch[0]}`);
    }
  }
});