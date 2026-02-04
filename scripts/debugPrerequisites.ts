// scripts/debugPrerequisites.ts

import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csvContent = fs.readFileSync('courses-report.2026-01-15.csv', 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true
});

console.log('🔍 Checking prerequisite data in CSV\n');

// Find ECE courses
const eceCourses = records.filter((row: any) => 
  row['Subject code'] === 'ECE' && 
  ['101', '201', '274A', '369A'].includes(row['Catalog Number'])
);

console.log('Found ECE courses:\n');

eceCourses.forEach((row: any) => {
  console.log(`${row['Subject code']}-${row['Catalog Number']}: ${row['Course Title']}`);
  console.log(`  Course Requisites: "${row['Course Requisites']}"`);
  console.log(`  Enrollment Requirements: "${row['Enrollment Requirements']}"`);
  console.log('');
});

// Check all column names
console.log('\n📋 All CSV Column Names:');
const columns = Object.keys(records[0]);
columns.forEach((col, idx) => {
  console.log(`  ${idx + 1}. "${col}"`);
});

// Look for any column that might contain 
console.log('\n🔎 Checking for prerequisite-related columns:');
columns.forEach(col => {
  if (col.toLowerCase().includes('req') || 
      col.toLowerCase().includes('pre') ||
      col.toLowerCase().includes('co')) {
    console.log(`  ✓ Found: "${col}"`);
    console.log(`    Sample value: "${records[0][col]}"`);
  }
});

