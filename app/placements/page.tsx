'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import styles from '../styles/placements.module.css';
import { getCourses, Course, getPrerequisites } from '../lib/courseData';
import { getRecommendedBatch, PrerequisiteInfo } from '../lib/batchLogic';

type Step = 'upload' | 'results';

interface CourseGrade {
  course: string;
  description: string;
  grade: string;
  credits: number;
  term: string;
  isRetake?: boolean;
  originalGrade?: string;
  originalTerm?: string;
  allGrades?: string[];
  bestGrade?: string;
  bestGradeTerm?: string;
}

export default function PlacementsPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [grades, setGrades] = useState<CourseGrade[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Plan Next Semester state
  const [searchQuery, setSearchQuery] = useState('');
  const [plannedCourses, setPlannedCourses] = useState<Course[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(true);
  const [transcriptVerified, setTranscriptVerified] = useState(true);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  // Check for saved transcript on load
  useEffect(() => {
    const checkSavedTranscript = async () => {
      const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail');
      if (!userId) {
        setLoadingTranscript(false);
        return;
      }

      try {
        const response = await fetch(`/api/upload?userId=${encodeURIComponent(userId)}`);
        const data = await response.json();

        if (data.hasTranscript && data.courses?.length > 0) {
          // Transform to CourseGrade format
          const savedGrades: CourseGrade[] = data.courses.map((c: { course: string; description: string; grade: string; credits: number; term: string }) => ({
            course: c.course,
            description: c.description,
            grade: c.grade,
            credits: c.credits,
            term: c.term,
          }));
          setGrades(savedGrades);
          setStep('results');
        }
      } catch (error) {
        console.error('Error checking saved transcript:', error);
      } finally {
        setLoadingTranscript(false);
      }
    };

    checkSavedTranscript();
  }, []);

  // Get all courses for search
  const allCourses = useMemo(() => getCourses(), []);

  // Filter courses based on search query
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return allCourses.filter(c =>
      c.courseCode.toLowerCase().includes(query) ||
      c.courseName.toLowerCase().includes(query) ||
      c.department.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results
  }, [searchQuery, allCourses]);

  // Check if a prerequisite is met based on transcript grades
  const checkPrerequisite = (prereqCode: string): { met: boolean; grade: string } => {
    // Normalize course code for comparison
    const normalizedCode = prereqCode.toUpperCase().replace(/\s+/g, ' ').trim();

    // Find the course in the transcript
    const transcriptCourse = grades.find(g => {
      const gradeCode = g.course.toUpperCase().replace(/\s+/g, ' ').trim();
      return gradeCode === normalizedCode;
    });

    if (!transcriptCourse) {
      return { met: false, grade: 'N/A' };
    }

    // Check if grade is passing (not E, F, or IP)
    const passingGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'P', 'S'];
    const isPassing = passingGrades.includes(transcriptCourse.grade);

    return { met: isPassing, grade: transcriptCourse.grade };
  };

  // Get prerequisite info for a course
  const getPrereqInfo = (course: Course): PrerequisiteInfo[] => {
    const prereqs = getPrerequisites(course.courseCode);
    return prereqs.map(p => {
      const { met, grade } = checkPrerequisite(p.courseCode);
      return {
        code: p.courseCode,
        name: p.courseName,
        grade,
        met
      };
    });
  };

  // Add a course to planned list
  const addPlannedCourse = (course: Course) => {
    if (!plannedCourses.find(c => c.courseCode === course.courseCode)) {
      setPlannedCourses([...plannedCourses, course]);
    }
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Remove a course from planned list
  const removePlannedCourse = (courseCode: string) => {
    setPlannedCourses(plannedCourses.filter(c => c.courseCode !== courseCode));
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle transcript upload via API
  const handleTranscriptUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadError(null);
    // Call the upload API
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Get userId from localStorage if available
      const userId = localStorage.getItem('userId') || 'demo-user';
      formData.append('userId', userId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Check verification status FIRST - reject if not verified
      if (data.verification && !data.verification.verified) {
        setTranscriptVerified(false);
        setVerificationMessage(data.verification.message);
        setUploadError(`⚠️ This transcript does not belong to you. ${data.verification.message} Please upload your own transcript.`);
        setSelectedFile(null);
        return; // Don't proceed - stay on upload page
      }

      // Verification passed - proceed with parsing
      setTranscriptVerified(true);
      setVerificationMessage(null);

      // Transform API response to grades format
      const courseGrades: CourseGrade[] = data.courses?.map((c: { course: string; description: string; grade: string; credits: number; term: string; isRetake?: boolean; originalGrade?: string; originalTerm?: string; allGrades?: string[]; bestGrade?: string; bestGradeTerm?: string }) => ({
        course: c.course,
        description: c.description || '',
        grade: c.grade,
        credits: c.credits || 3,
        term: c.term || 'Unknown Term',
        isRetake: c.isRetake,
        originalGrade: c.originalGrade,
        originalTerm: c.originalTerm,
        allGrades: c.allGrades,
        bestGrade: c.bestGrade,
        bestGradeTerm: c.bestGradeTerm,
      })) || [];

      setGrades(courseGrades);
      setStep('results');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError((error as Error).message || 'Failed to upload transcript');
    } finally {
      setUploading(false);
    }
  };



  // Calculate recommended track based on GPA
  // Retake logic:
  // - If original grade is C, D, or E: use the best grade, count credits once
  // - If original grade is B or better: average the grade points, count credits once
  const calculateRecommendation = () => {
    const gradePoints: Record<string, number> = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'E': 0.0, 'F': 0.0
    };

    // Grade threshold for "good" grades (B- or better)
    const goodGradeThreshold = 2.7;

    let totalPoints = 0;
    let totalCredits = 0;

    for (const course of grades) {
      // Skip IP (in progress) and W (withdrawn) grades
      if (course.grade === 'IP' || course.grade === 'W') continue;

      const credits = course.credits;

      if (course.isRetake && course.allGrades && course.allGrades.length > 1) {
        // This is a retake - apply special logic
        const allPoints = course.allGrades.map(g => gradePoints[g] ?? 0);
        const originalPoints = gradePoints[course.originalGrade || ''] ?? 0;

        if (originalPoints < goodGradeThreshold) {
          // Original grade was C, D, or E - use the BEST grade
          const bestPoints = Math.max(...allPoints);
          totalPoints += bestPoints * credits;
        } else {
          // Original grade was B or better - AVERAGE the points
          const avgPoints = allPoints.reduce((sum, p) => sum + p, 0) / allPoints.length;
          totalPoints += avgPoints * credits;
        }
        totalCredits += credits; // Count credits only once
      } else {
        // Normal course (not a retake)
        totalPoints += (gradePoints[course.grade] || 0) * credits;
        totalCredits += credits;
      }
    }

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    if (gpa >= 3.5) return 'fast';
    if (gpa >= 2.5) return 'standard';
    return 'supported';
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.topHeader}>
        <div className={styles.headerLogo}>
          <div className={styles.logoMark}>PM</div>
          <span className={styles.logoText}>PaceMatch</span>
        </div>
        <nav className={styles.headerNav}>
          <a href="/dashboard">Dashboard</a>
          <a href="/progress">Calculate Grades</a>
          <a href="/mentoring">Mentoring</a>
        </nav>
        <button className={styles.headerCta} onClick={() => router.push('/dashboard')}>
          ← Back
        </button>
      </header>

      {/* HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>My Courses</h1>
          <p className={styles.heroSubtext}>
            Upload your transcript to find your optimal course pace and get matched to the right batch for academic success.
          </p>
        </div>
      </section>

      <main className={styles.main}>

        {/* Step 2a: Upload Transcript */}
        {step === 'upload' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Upload Your Unofficial Transcript</CardTitle>
              <CardDescription>Upload a PDF of your unofficial transcript from UAccess</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
              />

              <div className={styles.uploadArea}>
                {uploading ? (
                  <div className={styles.uploading}>
                    <div className={styles.spinner}></div>
                    <p>Analyzing transcript...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl mb-4">📁</div>
                    <p className="text-muted-foreground mb-4">Drag and drop your transcript here, or</p>
                    <Button onClick={triggerFileInput} variant="outline" size="lg">
                      Choose File
                    </Button>

                    {/* Selected File Display */}
                    {selectedFile && (
                      <div className="mt-4 p-3 bg-primary/5 border border-primary rounded-lg inline-flex items-center gap-2">
                        <span className="font-medium">📄 {selectedFile.name}</span>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground mt-4">Supports: PDF, JPG, PNG</p>

                    {/* Error Display */}
                    {uploadError && (
                      <p className="text-destructive mt-2 font-medium">{uploadError}</p>
                    )}
                  </>
                )}
              </div>

              {/* Submit Button - Only show when file is selected */}
              {selectedFile && !uploading && (
                <Button
                  onClick={handleTranscriptUpload}
                  size="lg"
                  className="w-full mt-6"
                >
                  Submit Transcript
                </Button>
              )}


            </CardContent>
          </Card>
        )}



        {/* Step 3: Results */}
        {step === 'results' && (
          <div className={styles.resultsSection}>
            {/* Success Banner */}
            <div className={styles.successBanner}>
              <span className={styles.successIcon}>✓</span>
              <div>
                <h3>Transcript Imported Successfully!</h3>
                <p>Found {grades.length} courses across {[...new Set(grades.map(g => g.term))].length} semesters</p>
              </div>
              <button
                className={styles.updateTranscriptBtn}
                onClick={() => {
                  setStep('upload');
                  setSelectedFile(null);
                  setUploadError(null);
                }}
                style={{
                  marginLeft: 'auto',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📄 Update Transcript
              </button>
            </div>

            {/* Plan Next Semester Section */}
            <div className={styles.planSection}>
              <div className={styles.planHeader}>
                <div className={styles.planIcon}>◎</div>
                <div>
                  <h3>Plan Next Semester</h3>
                  <p>Add courses you&apos;re planning to take and check prerequisites</p>
                </div>
              </div>

              {/* Search Input */}
              <div className={styles.searchContainer}>
                <div className={styles.searchWrapper}>
                  <span className={styles.searchIconText}>🔍</span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={`Search ${allCourses.length} courses (e.g., CSC 210, Chemistry)...`}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                </div>

                {/* Search Suggestions */}
                {showSuggestions && searchResults.length > 0 && (
                  <div className={styles.suggestions}>
                    {searchResults.map((course) => (
                      <button
                        key={course.courseCode}
                        className={styles.suggestionItem}
                        onClick={() => addPlannedCourse(course)}
                      >
                        <div>
                          <p className={styles.suggestionCode}>{course.courseCode}</p>
                          <p className={styles.suggestionName}>{course.courseName}</p>
                        </div>
                        <span>+</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Planned Courses List */}
              {plannedCourses.length > 0 ? (
                <div className={styles.plannedCourses}>
                  {plannedCourses.map((course) => {
                    const prereqInfo = getPrereqInfo(course);
                    const batchRec = getRecommendedBatch(prereqInfo);

                    return (
                      <div key={course.courseCode} className={styles.plannedCard}>
                        <div className={styles.plannedHeader}>
                          <div>
                            <p className={styles.plannedCode}>{course.courseCode}</p>
                            <p className={styles.plannedName}>{course.courseName}</p>
                          </div>
                          <button
                            className={styles.removeBtn}
                            onClick={() => removePlannedCourse(course.courseCode)}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Prerequisites */}
                        {prereqInfo.length > 0 && (
                          <div className={styles.prereqList}>
                            <p className={styles.prereqTitle}>Prerequisites</p>
                            {prereqInfo.map((prereq) => (
                              <div
                                key={prereq.code}
                                className={`${styles.prereqItem} ${prereq.met ? styles.prereqMet : styles.prereqNotMet}`}
                              >
                                <div>
                                  <p className={styles.prereqCode}>{prereq.code}</p>
                                  <p className={styles.prereqName}>{prereq.name}</p>
                                </div>
                                <div className={styles.prereqStatus}>
                                  <span className={styles.prereqGrade} style={{
                                    background: prereq.met ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                                    color: prereq.met ? '#059669' : '#DC2626'
                                  }}>
                                    {prereq.grade}
                                  </span>
                                  {prereq.met ? '✓' : '✗'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Batch Recommendation */}
                        <div className={`${styles.batchRec} ${batchRec.batchCode === 'A' ? styles.batchA :
                          batchRec.batchCode === 'B' ? styles.batchB :
                            styles.batchC
                          }`}>
                          <div>
                            <p className={styles.batchLabel}>Recommended Batch</p>
                            <p className={styles.batchName}>{batchRec.batch}</p>
                          </div>
                          {batchRec.canUpgrade && (
                            <button
                              className={styles.quizBtn}
                              onClick={() => {
                                // Store the course info for the quiz page
                                localStorage.setItem('upgradeFor', JSON.stringify({ courseCode: course.courseCode }));
                                router.push('/quiz');
                              }}
                            >
                              📝 Take Quiz to Upgrade
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyPlan}>
                  <div style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '16px' }}>◎</div>
                  <p>Search and add courses you&apos;re planning to take next semester</p>
                  <p className={styles.emptySubtext}>We&apos;ll check prerequisites and recommend your study batch</p>
                </div>
              )}
            </div>

            {/* Academic History */}
            <h2 className={styles.sectionTitle}>↗ Your Complete Academic History</h2>

            {/* Group courses by term - dynamically get all unique terms */}
            {Array.from(new Set(grades.map(g => g.term)))
              .sort((a, b) => {
                // Sort terms chronologically
                const termOrder: Record<string, number> = { 'Spring': 0, 'Summer': 1, 'Fall': 2, 'Winter': 3 };
                const [seasonA, yearA] = a.split(' ');
                const [seasonB, yearB] = b.split(' ');
                const yearDiff = parseInt(yearA) - parseInt(yearB);
                if (yearDiff !== 0) return yearDiff;
                return termOrder[seasonA] - termOrder[seasonB];
              })
              .map(term => {
                const termCourses = grades.filter(g => g.term === term);
                if (termCourses.length === 0) return null;

                // Check if this is the most recent term with IP courses
                const hasInProgress = termCourses.some(c => c.grade === 'IP');
                const isCurrentTerm = hasInProgress;

                return (
                  <div key={term} className={styles.semesterCard}>
                    <div className={styles.semesterHeader}>
                      <h3>{term}</h3>
                      {isCurrentTerm && <span className={styles.currentBadge}>Current</span>}
                    </div>
                    <div className={styles.courseList}>
                      {termCourses.map((g, i) => (
                        <div key={i} className={styles.courseRow}>
                          <div className={styles.courseInfo}>
                            <span className={styles.courseCode}>{g.course}</span>
                            <span className={styles.courseDesc}>
                              {g.description}
                              {g.isRetake && (
                                <span style={{
                                  marginLeft: '8px',
                                  fontSize: '0.75rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#3b82f6'
                                }}>
                                  Retake (Best: {g.bestGrade} in {g.bestGradeTerm})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className={styles.courseRight}>
                            <span className={styles.credits}>{g.credits} credits</span>
                            {g.grade === 'IP' ? (
                              <span className={styles.inProgressBadge}>In Progress</span>
                            ) : g.grade === 'W' ? (
                              <span className={styles.gradeBadge} style={{ background: '#9ca3af', color: 'white' }}>
                                W
                              </span>
                            ) : (
                              <span className={`${styles.gradeBadge} ${g.grade === 'E' ? styles.gradeE : ''}`}>
                                {g.isRetake ? g.bestGrade : g.grade}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}


            {/* Recommendation Card - Only show if transcript is verified */}
            {transcriptVerified ? (
              <div className={styles.recommendationCard}>
                {calculateRecommendation() === 'fast' && (
                  <div className={styles.trackBadge} style={{ background: '#22c55e' }}>
                    ⚡ Fast Track (7 weeks)
                  </div>
                )}
                {calculateRecommendation() === 'standard' && (
                  <div className={styles.trackBadge} style={{ background: '#3b82f6' }}>
                  </div>
                )}
                {calculateRecommendation() === 'supported' && (
                  <div className={styles.trackBadge} style={{ background: '#f97316' }}>
                    🎯 Supported Track (Full Semester + Tutoring)
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: '20px',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                  <h3 style={{ margin: 0, color: '#DC2626' }}>Transcript Verification Failed</h3>
                </div>
                <p style={{ margin: '0 0 16px 0', color: '#6b7280' }}>
                  {verificationMessage || 'This transcript does not appear to match your profile. Please upload your own transcript to get personalized recommendations.'}
                </p>
                <button
                  onClick={() => {
                    setStep('upload');
                    setSelectedFile(null);
                    setUploadError(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#DC2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  📤 Upload Your Own Transcript
                </button>
              </div>
            )}

            <div className={styles.actions}>
              <button className={styles.enrollBtn} onClick={() => alert('✅ Enrolled successfully!')}>
              </button>
            </div>

            {/* Upload New Transcript Section */}
            <div style={{
              marginTop: '40px',
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(171, 5, 32, 0.05) 0%, rgba(0, 33, 71, 0.05) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(0, 33, 71, 0.1)',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--uofa-blue, #002147)' }}>📄 Update Your Transcript</h3>
              <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '0.9rem' }}>
                Have a new transcript? Upload it to keep your course history and GPA up to date.
              </p>
              <button
                onClick={() => {
                  setStep('upload');
                  setSelectedFile(null);
                  setUploadError(null);
                }}
                style={{
                  padding: '12px 24px',
                  background: 'var(--uofa-blue, #002147)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                📤 Upload New Transcript
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}