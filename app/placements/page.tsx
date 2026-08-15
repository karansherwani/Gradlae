'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import styles from '../styles/placements.module.css';
import { fetchCourses, setCourses, Course, getPrerequisites } from '../lib/courseData';
import { getRecommendedBatch, PrerequisiteInfo } from '../lib/batchLogic';
import { extractPdfTextInBrowser } from '../lib/browserPdfText';
import { parseTranscriptText } from '../lib/transcriptTextParser';
import { courseCodeToDisplay } from '../lib/courseCodes';
import type { DegreeAuditResult } from '../lib/degreeAudit';

type Step = 'upload' | 'results';

async function readJsonResponse(response: Response) {
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    if (response.ok) return {};
    throw new Error(`Request failed with status ${response.status}`);
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const shortText = trimmed
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);

    if (response.status === 413) {
      throw new Error('This PDF is too large for the deployed upload endpoint. Try a smaller PDF export.');
    }

    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      throw new Error(`The deployed upload endpoint returned an HTML error page instead of JSON${response.status ? ` (status ${response.status})` : ''}.`);
    }

    throw new Error(shortText || `Upload failed with status ${response.status}`);
  }
}

interface TranscriptUploadResponse {
  success?: boolean;
  courses?: CourseGrade[];
  hasTranscript?: boolean;
  verification?: {
    verified: boolean;
    message: string;
  };
}

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
  const { user, accessToken, loading: authLoading } = useAuth();
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
  const [degreeAudit, setDegreeAudit] = useState<DegreeAuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [eligibilityByCourse, setEligibilityByCourse] = useState<Record<string, PrerequisiteInfo[]>>({});
  const [plannerLoaded, setPlannerLoaded] = useState(false);

  // Check for saved transcript on load
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }

    const checkSavedTranscript = async () => {
      if (!accessToken) {
        setLoadingTranscript(false);
        return;
      }

      try {
        const response = await fetch('/api/upload', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await readJsonResponse(response) as TranscriptUploadResponse;

        const savedCourses = data.courses ?? [];
        if (data.hasTranscript && savedCourses.length > 0) {
          const savedGrades: CourseGrade[] = savedCourses.map((c: { course: string; description: string; grade: string; credits: number; term: string }) => ({
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
  }, [authLoading, user, accessToken]);

  useEffect(() => {
    if (!accessToken || step !== 'results') return;

    const loadAudit = async () => {
      setAuditLoading(true);
      try {
        const response = await fetch('/api/degree-audit', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await readJsonResponse(response) as { audit?: DegreeAuditResult };
        if (response.ok && data.audit) {
          setDegreeAudit(data.audit);
        }
      } catch (error) {
        console.error('Degree audit load error:', error);
      } finally {
        setAuditLoading(false);
      }
    };

    void loadAudit();
  }, [accessToken, step, grades.length]);

  useEffect(() => {
    if (!accessToken || plannerLoaded) return;

    const loadPlanner = async () => {
      try {
        const response = await fetch('/api/planner', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await readJsonResponse(response) as {
          planner?: { plannedCourseCodes?: string[] };
        };

        const codes = data.planner?.plannedCourseCodes || [];
        if (codes.length === 0) {
          setPlannerLoaded(true);
          return;
        }

        const restored: Course[] = [];
        for (const code of codes) {
          const courseResponse = await fetch(`/api/courses?code=${encodeURIComponent(code)}`);
          const courseData = await readJsonResponse(courseResponse) as { courses?: Array<Record<string, string | number>> };
          const row = courseData.courses?.[0];
          if (!row) continue;
          restored.push({
            courseCode: `${row.subject || ''} ${row.catalogNumber || ''}`.trim(),
            courseName: String(row.title || ''),
            department: String(row.offeringUnit || ''),
            credits: Number(row.minUnits || 0),
            description: String(row.description || ''),
            track: '',
            level: '',
            prerequisite1: String(row.enrollmentRequirements || ''),
            prerequisite2: String(row.courseRequisites || ''),
          });
        }

        if (restored.length > 0) {
          setPlannedCourses(restored);
        }
      } catch (error) {
        console.error('Planner load error:', error);
      } finally {
        setPlannerLoaded(true);
      }
    };

    void loadPlanner();
  }, [accessToken, plannerLoaded]);

  useEffect(() => {
    if (!accessToken || !plannerLoaded) return;

    const timeout = setTimeout(async () => {
      try {
        await fetch('/api/planner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            planner: {
              plannedCourseCodes: plannedCourses.map((course) => course.courseCode),
            },
          }),
        });
      } catch (error) {
        console.error('Planner save error:', error);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [plannedCourses, accessToken, plannerLoaded]);

  useEffect(() => {
    if (plannedCourses.length === 0) {
      setEligibilityByCourse({});
      return;
    }

    let cancelled = false;

    const loadEligibility = async () => {
      const next: Record<string, PrerequisiteInfo[]> = {};

      for (const course of plannedCourses) {
        try {
          const response = await fetch('/api/courses/eligibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: course.courseCode,
              completedCourses: grades,
            }),
          });
          const data = await readJsonResponse(response) as {
            eligible?: boolean;
            missingDetails?: Array<{ courseId: string; courseName: string; reason: string }>;
          };

          if (data.eligible) {
            next[course.courseCode] = [];
            continue;
          }

          next[course.courseCode] = (data.missingDetails || []).map((detail) => ({
            code: courseCodeToDisplay(detail.courseId),
            name: detail.courseName,
            grade: 'N/A',
            met: false,
          }));
        } catch (error) {
          console.error('Eligibility check error:', error);
          next[course.courseCode] = getPrerequisites(course.courseCode).map((prereq) => {
            const normalizedCode = prereq.courseCode.toUpperCase().replace(/\s+/g, ' ').trim();
            const transcriptCourse = grades.find((g) => g.course.toUpperCase().replace(/\s+/g, ' ').trim() === normalizedCode);
            const passingGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'P', 'S'];
            const grade = transcriptCourse?.grade || 'N/A';
            return {
              code: prereq.courseCode,
              name: prereq.courseName,
              grade,
              met: Boolean(transcriptCourse && passingGrades.includes(transcriptCourse.grade)),
            };
          });
        }
      }

      if (!cancelled) {
        setEligibilityByCourse(next);
      }
    };

    void loadEligibility();
    return () => { cancelled = true; };
  }, [plannedCourses, grades]);

  // Fetch courses from CSV via API — search-driven now
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Load initial batch so prerequisite lookup works
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const courses = await fetchCourses();
        setCourses(courses);
        setAllCourses(courses);
      } catch (error) {
        console.error('Error loading initial courses:', error);
      }
    };
    loadInitial();
  }, []);

  // API-driven search results
  const [searchResults, setSearchResults] = useState<Course[]>([]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setCoursesLoading(true);
      try {
        const results = await fetchCourses(searchQuery);
        if (!cancelled) {
          setSearchResults(results.slice(0, 10));
          // Merge into allCourses for prereq lookup
          setAllCourses(prev => {
            const existing = new Set(prev.map(c => c.courseCode));
            const newOnes = results.filter(c => !existing.has(c.courseCode));
            return [...prev, ...newOnes];
          });
          setCourses([...allCourses, ...results]);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    }, 300); // 300ms debounce
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [searchQuery]);

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

    const applyUploadData = (data: TranscriptUploadResponse) => {
      if (data.verification && !data.verification.verified) {
        setTranscriptVerified(false);
        setVerificationMessage(data.verification.message);
        setUploadError(`This transcript does not belong to you. ${data.verification.message} Please upload your own transcript.`);
        setSelectedFile(null);
        return false;
      }

      setTranscriptVerified(true);
      setVerificationMessage(null);

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
      return true;
    };

    try {
      if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
        const text = await extractPdfTextInBrowser(selectedFile);
        const transcript = parseTranscriptText(text);

        if (transcript.courses.length === 0) {
          throw new Error('I could not find course rows in this PDF. Please export the transcript as a text-based PDF from UAccess and try again.');
        }

        const saveResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ transcript }),
        });
        const saveData = await readJsonResponse(saveResponse);
        if (!saveResponse.ok) {
          throw new Error(saveData.error || 'Failed to save parsed transcript');
        }
        applyUploadData(saveData);
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);

      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      applyUploadData(data);
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
        <div className={styles.headerLogo} onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
          <img src="/gradlae-logo.png" alt="Gradlae" className="brandLogo" />
        </div>
        <nav className={styles.headerNav}>
          <a href="/dashboard">Dashboard</a>
          <a href="/progress">Calculate Grades</a>
          <a href="/mentoring">Mentoring</a>
        </nav>
        <button className={styles.headerCta} onClick={() => router.push('/dashboard')}>
          Back
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
                    <div className="text-sm font-semibold tracking-wide text-muted-foreground mb-4">TRANSCRIPT FILE</div>
                    <p className="text-muted-foreground mb-4">Drag and drop your transcript here, or</p>
                    <Button onClick={triggerFileInput} variant="outline" size="lg">
                      Choose File
                    </Button>

                    {/* Selected File Display */}
                    {selectedFile && (
                      <div className="mt-4 p-3 bg-primary/5 border border-primary rounded-lg inline-flex items-center gap-2">
                        <span className="font-medium">{selectedFile.name}</span>
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
              <span className={styles.successIcon}>OK</span>
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
              >
                Update Transcript
              </button>
            </div>

            <div className={styles.planSection}>
              <div className={styles.planHeader}>
                <div className={styles.planIcon}>▣</div>
                <div>
                  <h3>Degree Progress</h3>
                  <p>Requirements tracked against your saved degree plan</p>
                </div>
              </div>

              {auditLoading && <p className={styles.emptySubtext}>Calculating degree progress...</p>}

              {!auditLoading && degreeAudit && (
                <div className={styles.plannedCourses}>
                  <div className={styles.plannedCard}>
                    <div className={styles.plannedHeader}>
                      <div>
                        <p className={styles.plannedCode}>{degreeAudit.planName}</p>
                        <p className={styles.plannedName}>Catalog {degreeAudit.catalogYear}</p>
                      </div>
                    </div>
                    <div className={styles.prereqList}>
                      <p className={styles.prereqTitle}>Credits</p>
                      <div className={styles.prereqItem}>
                        <span>Earned: {degreeAudit.unitsEarned}</span>
                        <span>In progress: {degreeAudit.unitsInProgress}</span>
                        <span>Remaining: {degreeAudit.unitsRemaining}</span>
                      </div>
                      <p className={styles.prereqTitle}>Required courses</p>
                      <div className={styles.prereqItem}>
                        <span>Satisfied: {degreeAudit.satisfiedCount}</span>
                        <span>In progress: {degreeAudit.inProgressCount}</span>
                        <span>Remaining: {degreeAudit.remainingCount}</span>
                      </div>
                    </div>
                  </div>

                  {degreeAudit.requirements.filter((req) => req.status === 'remaining').slice(0, 6).map((req) => (
                    <div key={req.key} className={`${styles.prereqItem} ${styles.prereqNotMet}`}>
                      <div>
                        <p className={styles.prereqCode}>{req.label}</p>
                        <p className={styles.prereqName}>{req.units} units still needed</p>
                      </div>
                      <div className={styles.prereqStatus}>Remaining</div>
                    </div>
                  ))}
                </div>
              )}
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
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={coursesLoading ? 'Loading courses...' : 'Search for courses...'}
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
                    const prereqInfo = eligibilityByCourse[course.courseCode] || [];
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
                            Remove
                          </button>
                        </div>

                        {/* Prerequisites */}
                        {prereqInfo.length > 0 ? (
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
                                  {prereq.met ? 'Met' : 'Missing'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.prereqList}>
                            <p className={styles.prereqTitle} style={{ color: '#059669' }}>Prerequisites satisfied</p>
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
                              Take Quiz to Upgrade
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
                              <span className={`${styles.gradeBadge} ${styles.gradeW}`}>
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


            <div className={styles.actions}>
              <button className={styles.enrollBtn} onClick={() => alert('Enrolled successfully!')}>
              </button>
            </div>


          </div>
        )}
      </main>
    </div>
  );
}
