// scripts/testDegreePlan.ts

import fs from 'fs';

const degreeData = JSON.parse(
  fs.readFileSync('data/degreeRequirements.json', 'utf-8')
);

const plan = degreeData.plans[0];

console.log('🎓 Degree Plan:', plan.name);
console.log('📅 Catalog Year:', plan.catalogYear);
console.log('📊 Total Units:', plan.totalUnits);
console.log('\n📚 Semesters:', plan.semesters.length);

plan.semesters.forEach((semester: any) => {
  console.log(`\n${semester.name} (${semester.totalUnits.min}-${semester.totalUnits.max} units):`);
  semester.courses.forEach((course: any) => {
    if (course.courseId) {
      console.log(`  ✓ ${course.courseId}: ${course.title}`);
    } else {
      console.log(`  ○ ${course.electiveType}`);
    }
  });
});

console.log('\n🎯 Elective Categories:');
plan.electiveCategories.forEach((cat: any) => {
  console.log(`  • ${cat.name}: ${cat.requiredUnits} units`);
});