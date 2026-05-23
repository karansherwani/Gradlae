'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/quiz.module.css';
import { getBatchRecommendation } from '@/app/lib/courseData';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  hash: string;
}

interface QuizData {
  courseNumber: string;
  courseName: string;
  questions: QuizQuestion[];
  generationSeed: string;
}

interface PreviousAttempt {
  score: number;
  total: number;
  percentage: number;
  attemptDate: string;
}

export default function QuizPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const userEmail = user?.email || '';
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [courseNumber, setCourseNumber] = useState('');
  const [error, setError] = useState('');
  const [quizStarted, setQuizStarted] = useState(false);
  const [previousAttempt, setPreviousAttempt] = useState<PreviousAttempt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preReqCourse, setPreReqCourse] = useState<{ courseNumber: string; courseName: string } | null>(null);
  const tabSwitchRef = useRef(false);

  // Quiz phase: 'loading' | 'instructions' | 'quiz' | 'no-course'
  const [quizPhase, setQuizPhase] = useState<'loading' | 'instructions' | 'quiz' | 'no-course'>('loading');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  // Load selected course from the canonical CSV-backed API
  useEffect(() => {
    const extractPrereqCodes = (...values: string[]): string[] => {
      return values
        .flatMap(value => Array.from(value.matchAll(/[A-Z]{2,5}\s*\d{3}[A-Z]*/g)).map(match => match[0]))
        .map(code => code.replace(/\s+/g, ' ').trim())
        .filter((code, index, arr) => arr.indexOf(code) === index);
    };

    const fetchCourseInfo = async (courseCode: string) => {
      const response = await fetch(`/api/courses?q=${encodeURIComponent(courseCode)}&limit=20`);
      if (!response.ok) return null;
      const data = await response.json();
      const normalized = courseCode.replace(/\s+/g, ' ').trim().toUpperCase();
      const courses = (data.courses || []) as Array<Record<string, string | number>>;
      const match = courses.find(course => (
        `${course.subject || ''} ${course.catalogNumber || ''}`.replace(/\s+/g, ' ').trim().toUpperCase() === normalized
      )) || courses[0];

      if (!match) return null;

      return {
        code: `${match.subject || ''} ${match.catalogNumber || ''}`.trim(),
        name: String(match.title || 'General Readiness'),
        credits: Number(match.minUnits || 3),
        prereqs: extractPrereqCodes(
          String(match.enrollmentRequirements || ''),
          String(match.courseRequisites || '')
        )
      };
    };

    const loadData = async () => {
      try {
        // Check for passed course from placements page
        const upgradeFor = localStorage.getItem('upgradeFor');
        if (upgradeFor) {
          const { courseCode } = JSON.parse(upgradeFor);
          setCourseNumber(courseCode);

          const courseInfo = await fetchCourseInfo(courseCode);
          if (courseInfo && courseInfo.prereqs.length > 0) {
            const preReqCode = courseInfo.prereqs[0];
            const prerequisiteInfo = await fetchCourseInfo(preReqCode);
            const preReqName = prerequisiteInfo?.name || 'Prerequisite Course';

            setPreReqCourse({
              courseNumber: preReqCode,
              courseName: preReqName
            });
          } else {
            // If no prereqs or not in catalog, assess for the course itself (general readiness)
            setPreReqCourse({
              courseNumber: courseCode,
              courseName: courseInfo?.name || 'General Readiness'
            });
          }
          setQuizPhase('instructions');
        } else {
          // No course selected - redirect back to My Courses
          setQuizPhase('no-course');
        }
      } catch (err) {
        console.error('Failed to load course data', err);
        setQuizPhase('no-course');
      }
    };

    loadData();
  }, [router]);

  // Wrap handleSubmit in useCallback
  const handleSubmit = useCallback(async () => {
    if (!quizData || !userEmail) return;

    setSubmitting(true);

    try {
      const score = selectedAnswers.filter(
        (answer, idx) => answer === quizData!.questions[idx].correct
      ).length;

      const percentage = Math.round((score / quizData.questions.length) * 100);
      const batch = getBatchRecommendation(percentage);
      const questionHashes = quizData.questions.map(q => q.hash);

      // Submit to backend
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      else headers['x-user-email'] = userEmail;

      const response = await fetch('/api/submit-quiz', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courseNumber: quizData.courseNumber,
          courseName: quizData.courseName,
          score,
          total: quizData.questions.length,
          questionsUsed: questionHashes,
          tabSwitchDetected: tabSwitchRef.current,
        }),
      });

      const submitData = await response.json();

      if (!response.ok) {
        throw new Error(submitData.error);
      }

      if (tabSwitchRef.current) {
        console.warn('Tab switch detected! Quiz automatically submitted.');
      }

      // Clear the upgradeFor so user can take another quiz later
      localStorage.removeItem('upgradeFor');

      // Redirect to results
      router.push(`/results?score=${score}&total=${quizData.questions.length}&percentage=${percentage}&batch=${batch.name}`);
    } catch (err) {
      setError((err as Error).message);
      console.error('Submit error:', err);
      setSubmitting(false);
    }
  }, [quizData, userEmail, selectedAnswers, router]);

  // Handle tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && quizStarted && quizData) {
        tabSwitchRef.current = true;
        handleSubmit();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [quizStarted, quizData, handleSubmit]);

  const handleStartQuiz = async () => {
    if (!courseNumber || !preReqCourse || !userEmail) return;

    setLoading(true);
    setError('');

    try {
      const quizHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) quizHeaders['Authorization'] = `Bearer ${accessToken}`;
      else quizHeaders['x-user-email'] = userEmail;

      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: quizHeaders,
        body: JSON.stringify({
          courseNumber: preReqCourse.courseNumber,
          courseName: preReqCourse.courseName,
          difficulty: 'medium',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setPreviousAttempt({
            score: data.previousScore,
            total: data.totalQuestions,
            percentage: data.percentage,
            attemptDate: new Date(data.attemptDate).toLocaleDateString(),
          });
          setError('');
          return;
        }
        throw new Error(data.error || 'Failed to generate quiz');
      }

      // Extract the quiz from the response wrapper
      const quiz = data.quiz;
      if (!quiz || !quiz.questions) {
        throw new Error('Invalid quiz data received from server');
      }

      setQuizData(quiz);
      setSelectedAnswers(new Array(quiz.questions.length).fill(null));
      setCurrentQuestion(0);
      setShowExplanation(false);
      setQuizPhase('quiz');
      setQuizStarted(true);
      setPreviousAttempt(null);
      setError('');
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      console.error('Quiz generation error:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (optionIndex: number) => {
    if (showExplanation) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleShowExplanation = () => {
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < (quizData?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowExplanation(false);
    } else {
      handleSubmit();
    }
  };

  // Shared Header Component
  const QuizHeader = () => (
    <>
      <header className={styles.topHeader}>
        <div className={styles.headerLogo} onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
          <img src="/gradlae-logo.png" alt="Gradlae" className="brandLogo" />
        </div>
        <nav className={styles.headerNav}>
          <a href="/dashboard">Dashboard</a>
          <a href="/placements">My Courses</a>
          <a href="/progress">Calculate Grades</a>
        </nav>
        <button className={styles.headerCta} onClick={() => router.push('/placements')}>
          Back
        </button>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Prerequisite Knowledge Assessment</h1>
          <p className={styles.heroSubtext}>
            Verify your readiness for upcoming courses and unlock accelerated placement options.
          </p>
        </div>
      </section>
    </>
  );

  // Loading state
  if (quizPhase === 'loading') {
    return (
      <div className={styles.container}>
        <QuizHeader />
        <main className={styles.main}>
          <div className={styles.quizForm}>
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading quiz data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // No course selected - redirect message
  if (quizPhase === 'no-course') {
    return (
      <div className={styles.container}>
        <QuizHeader />
        <main className={styles.main}>
          <div className={styles.quizForm}>
            <div className={styles.noCourseMessage}>
              <div className={styles.noCourseIcon}>Course</div>
              <h2>No Course Selected</h2>
              <p>Please select a course from the My Courses page to take the prerequisite assessment.</p>
              <button
                className={styles.generateBtn}
                onClick={() => router.push('/placements')}
              >
                Go to My Courses
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Instructions phase
  if (quizPhase === 'instructions') {
    return (
      <div className={styles.container}>
        <QuizHeader />
        <main className={styles.main}>
          <div className={styles.quizForm}>
            {/* Course Info */}
            <div className={styles.courseHeader}>
              <p className={styles.assessingFor}>Assessing prerequisite knowledge for:</p>
              <h2 className={styles.courseName}>{courseNumber}</h2>
              <p className={styles.prereqInfo}>Quiz Topic: {preReqCourse?.courseNumber} - {preReqCourse?.courseName}</p>
            </div>

            {/* Previous Attempt Warning */}
            {previousAttempt && (
              <div className={styles.previousAttempt}>
                <h3>Already Completed</h3>
                <p>
                  <strong>Score:</strong> {previousAttempt.score}/{previousAttempt.total} ({previousAttempt.percentage}%)
                </p>
                <p>
                  <strong>Date:</strong> {previousAttempt.attemptDate}
                </p>
                <p className={styles.attemptNote}>You cannot retake this assessment.</p>
              </div>
            )}

            {!previousAttempt && (
              <>
                {/* Quiz Details */}
                <h3 className={styles.sectionTitle}>Quiz Details</h3>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailCard}>
                    <span className={styles.detailValue}>10</span>
                    <span className={styles.detailLabel}>Questions</span>
                  </div>
                  <div className={styles.detailCard}>
                    <span className={styles.detailValue}>~30 min</span>
                    <span className={styles.detailLabel}>Duration</span>
                  </div>
                </div>

                {/* One Attempt Warning */}
                <div className={styles.attemptWarning}>
                  <div className={styles.warningIcon}>!</div>
                  <div>
                    <h4>One Attempt Per Course</h4>
                    <p>You can only take this quiz once for each course. Make sure you&apos;re ready before starting.</p>
                  </div>
                </div>

                {/* Academic Integrity Notice */}
                <div className={styles.integrityNotice}>
                  <div className={styles.integrityHeader}>
                    <div className={styles.integrityIcon}>ID</div>
                    <h4>Academic Integrity Notice</h4>
                  </div>
                  <ul className={styles.integrityList}>
                    <li>Switching tabs or windows will <strong>automatically submit</strong> your quiz</li>
                    <li>Using external resources during the quiz is not permitted</li>
                    <li>Ensure you have a stable internet connection before starting</li>
                    <li>Your quiz results determine your batch placement recommendation</li>
                  </ul>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {/* Start Button */}
                <button
                  className={styles.startQuizBtn}
                  onClick={handleStartQuiz}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className={styles.btnSpinner}></span>
                      Generating Quiz...
                    </>
                  ) : (
                    'Start Quiz'
                  )}
                </button>

                <button
                  className={styles.cancelBtn}
                  onClick={() => router.push('/placements')}
                >
                  Cancel
                </button>
              </>
            )}

            {previousAttempt && (
              <button
                className={styles.generateBtn}
                onClick={() => router.push('/placements')}
              >
                Return to My Courses
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Phase 3: Quiz (Existing Logic)
  if (!quizData) return null;

  const currentQ = quizData.questions[currentQuestion];
  const answered = selectedAnswers[currentQuestion] !== null;
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;

  return (
    <div className={styles.container}>
      <QuizHeader />
      <main className={styles.main}>
        {/* Existing Quiz JSX */}
        <div className={styles.quizHeader}>
          <div className={styles.courseInfo}>
            <h2>{quizData.courseNumber}</h2>
            <p>{quizData.courseName}</p>
            <p>Question {currentQuestion + 1} of {quizData.questions.length}</p>
            <p className={styles.userInfo}>{userEmail}</p>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progress} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className={styles.questionCard}>
          <h3>{currentQ.question}</h3>

          <div className={styles.options}>
            {currentQ.options.map((option, idx) => (
              <label
                key={idx}
                className={`${styles.option} ${selectedAnswers[currentQuestion] === idx ? styles.selected : ''
                  } ${showExplanation && idx === currentQ.correct ? styles.correct : ''} ${showExplanation &&
                    idx !== currentQ.correct &&
                    selectedAnswers[currentQuestion] === idx
                    ? styles.incorrect
                    : ''
                  }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQ.id}`}
                  value={idx}
                  checked={selectedAnswers[currentQuestion] === idx}
                  onChange={() => handleSelectAnswer(idx)}
                  disabled={showExplanation}
                />
                <span className={styles.optionText}>{option}</span>
                {showExplanation && idx === currentQ.correct && (
                  <span className={styles.badge}>Correct</span>
                )}
                {showExplanation &&
                  idx !== currentQ.correct &&
                  selectedAnswers[currentQuestion] === idx && (
                    <span className={styles.badge}>Incorrect</span>
                  )}
              </label>
            ))}
          </div>

          {showExplanation && (
            <div className={styles.explanation}>
              <h4>Explanation</h4>
              <p>{currentQ.explanation}</p>
            </div>
          )}

          <div className={styles.actions}>
            {!showExplanation && answered && (
              <button onClick={handleShowExplanation} className={styles.explainBtn}>
                Show Explanation
              </button>
            )}

            {showExplanation && (
              <button
                onClick={handleNextQuestion}
                disabled={submitting}
                className={styles.nextBtn}
              >
                {submitting
                  ? 'Submitting...'
                  : currentQuestion === quizData.questions.length - 1
                    ? 'Submit and Get Recommendation'
                    : 'Next Question'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.warning}>
          Switching tabs will auto-submit your quiz
        </div>
      </main>
    </div>
  );
}
