// lib/courseGraph.ts

import { Course, PrerequisiteNode, CompletedCourse, PrerequisiteCheck } from '@/types';

export class CourseGraph {
  private courses: Map<string, Course>;
  
  constructor(coursesData: Course[]) {
    this.courses = new Map(
      coursesData.map(c => [c.id, c])
    );
  }

  /**
   * Check if a student can take a specific course
   */
  canTakeCourse(
    courseId: string,
    completedCourses: CompletedCourse[]
  ): PrerequisiteCheck {
    const course = this.courses.get(courseId);
    
    if (!course) {
      return {
        eligible: false,
        missing: [courseId],
        missingDetails: [{
          courseId,
          courseName: 'Unknown',
          reason: 'Course not found in catalog'
        }]
      };
    }

    // If no prerequisites, student is eligible
    if (course.prerequisites.type === 'NONE') {
      return {
        eligible: true,
        missing: [],
        missingDetails: []
      };
    }

    // Check prerequisites
    const missingDetails = this.checkPrerequisites(
      course.prerequisites,
      completedCourses
    );

    return {
      eligible: missingDetails.length === 0,
      missing: missingDetails.map(d => d.courseId),
      missingDetails
    };
  }

  /**
   * Recursively check prerequisite tree
   */
  private checkPrerequisites(
    node: PrerequisiteNode,
    completed: CompletedCourse[]
  ): Array<{ courseId: string; courseName: string; reason: string }> {
    
    // Handle single course prerequisite
    if (node.type === 'COURSE') {
      if (!node.value) return [];
      
      const courseId = node.value;
      const completedCourse = completed.find(c => c.courseId === courseId);
      
      if (!completedCourse) {
        const course = this.courses.get(courseId);
        return [{
          courseId,
          courseName: course?.title || courseId,
          reason: 'Not completed'
        }];
      }

      // Check minimum grade requirement
      if (node.minGrade && !this.meetsGradeRequirement(completedCourse.grade, node.minGrade)) {
        const course = this.courses.get(courseId);
        return [{
          courseId,
          courseName: course?.title || courseId,
          reason: `Minimum grade ${node.minGrade} required (earned: ${completedCourse.grade})`
        }];
      }

      return []; // Prerequisite satisfied
    }

    // Handle AND logic - all children must be satisfied
    if (node.type === 'AND') {
      const allMissing: Array<{ courseId: string; courseName: string; reason: string }> = [];
      
      node.children?.forEach(child => {
        const missing = this.checkPrerequisites(child, completed);
        allMissing.push(...missing);
      });

      return allMissing;
    }

    // Handle OR logic - at least one child must be satisfied
    if (node.type === 'OR') {
      const results = node.children?.map(child => 
        this.checkPrerequisites(child, completed)
      ) || [];

      // If any option is satisfied (empty array), return empty
      const satisfiedOption = results.find(r => r.length === 0);
      if (satisfiedOption !== undefined) {
        return [];
      }

      // Return the option with fewest missing prerequisites
      const bestOption = results.reduce((best, current) => 
        current.length < best.length ? current : best
      );

      return bestOption;
    }

    return [];
  }

  /**
   * Check if earned grade meets minimum requirement
   */
  private meetsGradeRequirement(earnedGrade: string, minGrade: string): boolean {
    const gradeValues: Record<string, number> = {
      'A': 4.0,
      'B': 3.0,
      'C': 2.0,
      'D': 1.0,
      'F': 0.0,
      'P': 2.0  // Pass grade typically equals C
    };

    const earned = gradeValues[earnedGrade.toUpperCase()];
    const required = gradeValues[minGrade.toUpperCase()];

    if (earned === undefined || required === undefined) {
      return true; // If we can't determine, assume it's okay
    }

    return earned >= required;
  }

  /**
   * Get all courses a student is currently eligible to take
   */
  getEligibleCourses(completedCourses: CompletedCourse[]): Course[] {
    const eligible: Course[] = [];
    const completedIds = new Set(completedCourses.map(c => c.courseId));

    for (const course of this.courses.values()) {
      // Skip if already completed
      if (completedIds.has(course.id)) {
        continue;
      }

      const { eligible: canTake } = this.canTakeCourse(course.id, completedCourses);
      if (canTake) {
        eligible.push(course);
      }
    }

    return eligible;
  }

  /**
   * Get prerequisite chain for a course (shortest valid path)
   */
  getPrerequisiteChain(courseId: string): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const course = this.courses.get(id);
      if (!course) return;

      // Get prerequisite IDs, choosing first option for OR nodes
      const prereqIds = this.extractCourseIdsShortestPath(course.prerequisites);
      
      // Recursively traverse prerequisites first
      prereqIds.forEach(prereqId => traverse(prereqId));
      
      // Add current course after its prerequisites
      chain.push(id);
    };

    traverse(courseId);
    return chain;
  }

  /**
   * Extract course IDs, taking shortest path for OR nodes
   */
  private extractCourseIdsShortestPath(node: PrerequisiteNode): string[] {
    if (node.type === 'COURSE') {
      return node.value ? [node.value] : [];
    }

    if (node.type === 'AND') {
      return node.children?.flatMap(child => this.extractCourseIdsShortestPath(child)) || [];
    }

    if (node.type === 'OR') {
      // For OR nodes, just take the first option (shortest path)
      if (node.children && node.children.length > 0) {
        return this.extractCourseIdsShortestPath(node.children[0]);
      }
    }

    return [];
  }

  /**
   * Extract all course IDs from a prerequisite tree (for comprehensive analysis)
   */
  private extractCourseIds(node: PrerequisiteNode): string[] {
    if (node.type === 'COURSE') {
      return node.value ? [node.value] : [];
    }

    if (node.type === 'AND' || node.type === 'OR') {
      return node.children?.flatMap(child => this.extractCourseIds(child)) || [];
    }

    return [];
  }

  /**
   * Get courses that unlock after completing a specific course
   */
  getUnlockedCourses(courseId: string, completedCourses: CompletedCourse[]): Course[] {
    const unlocked: Course[] = [];
    const completedIds = new Set(completedCourses.map(c => c.courseId));
    
    // Don't simulate if already completed
    if (completedIds.has(courseId)) {
      return unlocked;
    }
    
    // Simulate completing this course
    const withNewCourse = [
      ...completedCourses,
      {
        courseId,
        courseName: this.courses.get(courseId)?.title || courseId,
        grade: 'A',
        units: this.courses.get(courseId)?.units.max || 3,
        semester: 'Current',
        term: 'Current',
        year: new Date().getFullYear()
      }
    ];

    // Check what becomes eligible
    for (const course of this.courses.values()) {
      // Skip if already completed
      if (completedIds.has(course.id)) {
        continue;
      }
      
      const wasEligible = this.canTakeCourse(course.id, completedCourses).eligible;
      const nowEligible = this.canTakeCourse(course.id, withNewCourse).eligible;

      if (!wasEligible && nowEligible) {
        unlocked.push(course);
      }
    }

    return unlocked;
  }

  /**
   * Get course by ID
   */
  getCourse(courseId: string): Course | undefined {
    return this.courses.get(courseId);
  }

  /**
   * Search courses by subject code
   */
  getCoursesBySubject(subjectCode: string): Course[] {
    return Array.from(this.courses.values())
      .filter(c => c.subjectCode === subjectCode);
  }

  /**
   * Search courses by keyword in title or description
   */
  searchCourses(keyword: string, limit: number = 20): Course[] {
    const lowerKeyword = keyword.toLowerCase();
    
    return Array.from(this.courses.values())
      .filter(c => 
        c.title.toLowerCase().includes(lowerKeyword) ||
        c.description.toLowerCase().includes(lowerKeyword) ||
        c.id.toLowerCase().includes(lowerKeyword)
      )
      .slice(0, limit);
  }

  /**
   * Get courses by catalog number range (e.g., 300-400 level)
   */
  getCoursesByLevel(minLevel: number, maxLevel: number, subjectCode?: string): Course[] {
    return Array.from(this.courses.values())
      .filter(c => {
        const catalogNum = parseInt(c.catalogNumber);
        const inRange = catalogNum >= minLevel && catalogNum < maxLevel;
        const matchesSubject = !subjectCode || c.subjectCode === subjectCode;
        return inRange && matchesSubject;
      });
  }

  /**
   * Validate a proposed schedule
   */
  validateSchedule(
    proposedCourses: string[],
    completedCourses: CompletedCourse[]
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    totalUnits: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalUnits = 0;

    // Check each course
    for (const courseId of proposedCourses) {
      const course = this.courses.get(courseId);
      
      if (!course) {
        errors.push(`Course ${courseId} not found`);
        continue;
      }

      totalUnits += course.units.max;

      // Check prerequisites
      const { eligible, missingDetails } = this.canTakeCourse(courseId, completedCourses);
      
      if (!eligible) {
        errors.push(
          `Cannot take ${courseId}: Missing ${missingDetails.map(d => d.courseId).join(', ')}`
        );
      }
    }

    // Check unit limits
    if (totalUnits < 12) {
      warnings.push('Schedule has fewer than 12 units (may not be full-time)');
    }
    if (totalUnits > 18) {
      warnings.push('Schedule exceeds 18 units (may require overload approval)');
    }

    // Check for duplicates
    const duplicates = proposedCourses.filter((course, index) => 
      proposedCourses.indexOf(course) !== index
    );
    if (duplicates.length > 0) {
      errors.push(`Duplicate courses: ${duplicates.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      totalUnits
    };
  }

  /**
   * Get statistics about the course catalog
   */
  getStatistics() {
    const courses = Array.from(this.courses.values());
    
    const bySubject: Record<string, number> = {};
    const byLevel: Record<string, number> = {
      '100-level': 0,
      '200-level': 0,
      '300-level': 0,
      '400-level': 0,
      '500+ level': 0
    };

    courses.forEach(course => {
      // Count by subject
      bySubject[course.subjectCode] = (bySubject[course.subjectCode] || 0) + 1;

      // Count by level
      const level = parseInt(course.catalogNumber);
      if (level < 200) byLevel['100-level']++;
      else if (level < 300) byLevel['200-level']++;
      else if (level < 400) byLevel['300-level']++;
      else if (level < 500) byLevel['400-level']++;
      else byLevel['500+ level']++;
    });

    return {
      totalCourses: courses.length,
      bySubject,
      byLevel,
      withPrerequisites: courses.filter(c => c.prerequisites.type !== 'NONE').length
    };
  }
}