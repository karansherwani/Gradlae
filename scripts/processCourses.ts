// scripts/processCourses.ts

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { Course, PrerequisiteNode } from '../types';

/**
 * Load manual prerequisite mappings
 */
function loadPrerequisiteMappings(): Record<string, PrerequisiteNode> {
  try {
    const data = JSON.parse(
      fs.readFileSync('data/coursePrerequisites.json', 'utf-8')
    );
    return data.prerequisites || {};
  } catch (error) {
    console.log('⚠️  No coursePrerequisites.json found, using CSV data only');
    return {};
  }
}

/**
 * Parse prerequisite string from CSV into structured format
 */
function parsePrerequisites(prereqString: string): PrerequisiteNode {
  // Handle empty or null prerequisites
  if (!prereqString || prereqString.trim() === '-' || prereqString.trim() === '') {
    return { type: 'NONE' };
  }

  const cleaned = prereqString.trim();

  // If it's just descriptive text (not course codes), store as raw
  if (!cleaned.match(/[A-Z]{2,5}\s*\d{3}/)) {
    return {
      type: 'NONE',
      raw: cleaned
    };
  }

  // Check for OR logic (e.g., "MATH 122B or 125")
  if (cleaned.toLowerCase().includes(' or ')) {
    const parts = cleaned.split(/\s+or\s+/i);
    return {
      type: 'OR',
      children: parts.map(part => parsePrerequisitePart(part.trim())),
      raw: cleaned
    };
  }

  // Check for AND logic (e.g., "ECE 101, MATH 129")
  if (cleaned.includes(',') || cleaned.toLowerCase().includes(' and ')) {
    const parts = cleaned.split(/[,;]|\s+and\s+/i);
    return {
      type: 'AND',
      children: parts
        .map(part => part.trim())
        .filter(part => part.length > 0)
        .map(part => parsePrerequisitePart(part)),
      raw: cleaned
    };
  }

  // Single course prerequisite
  return parsePrerequisitePart(cleaned);
}

/**
 * Parse a single prerequisite part
 */
function parsePrerequisitePart(part: string): PrerequisiteNode {
  // Extract course code (e.g., "MATH 129", "ECE101")
  const courseMatch = part.match(/([A-Z]{2,5})\s*(\d{3}[A-Z]*)/);
  
  if (courseMatch) {
    const subjectCode = courseMatch[1];
    const catalogNumber = courseMatch[2];
    
    return {
      type: 'COURSE',
      value: `${subjectCode}-${catalogNumber}`,
      raw: part
    };
  }

  // If we can't parse it, return as NONE with raw text
  return {
    type: 'NONE',
    raw: part
  };
}

/**
 * Normalize course ID to consistent format (e.g., "ECE-101")
 */
function normalizeCourseId(courseCode: string): string {
  const match = courseCode.match(/([A-Z]+)\s*(\d+[A-Z]*)/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return courseCode.replace(/\s+/g, '-');
}

/**
 * Main processing function
 */
async function processCourses() {
  console.log('📚 Starting course data processing...\n');

  // Load manual prerequisite mappings
  const manualPrereqs = loadPrerequisiteMappings();
  console.log(`✅ Loaded ${Object.keys(manualPrereqs).length} manual prerequisite mappings\n`);

  // Read CSV file
  const csvContent = fs.readFileSync('courses.csv', 'utf-8');
  
  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  console.log(`✅ Found ${records.length} courses in CSV\n`);

  // Process each course
  const courses: Course[] = records.map((row: any) => {
    const subjectCode = row['Subject code']?.trim() || '';
    const catalogNumber = row['Catalog Number']?.trim() || '';
    const courseId = `${subjectCode}-${catalogNumber}`;
    
    // Use manual prerequisite if available, otherwise parse from CSV
    const prerequisites = manualPrereqs[courseId] 
      ? manualPrereqs[courseId]
      : parsePrerequisites(row['Course Requisites'] || '');

    const course: Course = {
      id: courseId,
      courseId: parseInt(row['Course ID']) || 0,
      subjectCode,
      catalogNumber,
      title: row['Course Title']?.trim() || '',
      description: row['Course Description']?.trim() || '',
      units: {
        min: parseInt(row['Min Units']) || 0,
        max: parseInt(row['Max Units']) || 0
      },
      prerequisites,
      components: (row['Components'] || '')
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0),
      attributes: (row['Course Attributes'] || '')
        .split(',')
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0 && a !== '-'),
      offeringUnit: row['Offering Unit']?.trim() || '',
      gradingBasis: row['Grading Basis']?.trim() || '',
      repeatable: row['Repeatable for Credit']?.toLowerCase() === 'yes',
      enrollmentRequirements: row['Enrollment Requirements']?.trim() || undefined
    };

    return course;
  });

  console.log('✅ Courses processed successfully from courses.csv!');
  console.log(`📊 Total courses: ${courses.length}\n`);

  // Generate statistics
  const stats = {
    totalCourses: courses.length,
    withPrerequisites: courses.filter(c => c.prerequisites.type !== 'NONE').length,
    withManualPrereqs: courses.filter(c => manualPrereqs[c.id]).length,
    repeatable: courses.filter(c => c.repeatable).length
  };

  console.log('📈 Statistics:');
  console.log(`   - Total courses: ${stats.totalCourses}`);
  console.log(`   - Courses with prerequisites: ${stats.withPrerequisites}`);
  console.log(`   - Courses with manual prerequisites: ${stats.withManualPrereqs}`);
  console.log(`   - Repeatable courses: ${stats.repeatable}`);

  console.log('\n✨ Done!\n');
}

// Run the script
processCourses().catch(error => {
  console.error('❌ Error processing courses:', error);
  process.exit(1);
});
