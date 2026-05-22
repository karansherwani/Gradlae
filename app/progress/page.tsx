'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/progress.module.css';

interface GradeComponent {
    id: string;
    name: string;
    weight: number;
    score: number | null;
    completed: boolean;
}

interface Course {
    id: string;
    name: string;
    components: GradeComponent[];
}

interface TranscriptCourse {
    course: string;
    description: string;
    grade: string;
    credits: number;
    term: string;
    isRetake?: boolean;
    originalGrade?: string;
    originalTerm?: string;
    allGrades?: string[];
}

interface GPACalculatorCourse {
    id: string;
    name: string;
    credits: number;
    expectedGrade: string;
}

const GRADE_THRESHOLDS = [
    { grade: 'A', min: 90 },
    { grade: 'B', min: 80 },
    { grade: 'C', min: 70 },
    { grade: 'D', min: 60 },
    { grade: 'E', min: 0 },
];

const GRADE_POINTS: Record<string, number> = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'E': 0.0, 'F': 0.0, 'W': 0.0,
};

const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

const DEFAULT_COMPONENTS: GradeComponent[] = [
    { id: '1', name: 'Midterm 1', weight: 25, score: null, completed: false },
    { id: '2', name: 'Midterm 2', weight: 25, score: null, completed: false },
    { id: '3', name: 'Homework', weight: 20, score: null, completed: false },
    { id: '4', name: 'Attendance', weight: 5, score: null, completed: false },
    { id: '5', name: 'Final Exam', weight: 25, score: null, completed: false },
];

export default function ProgressPage() {
    const router = useRouter();
    const { user, dbUser, accessToken, loading: authLoading } = useAuth();
    const studentName = dbUser?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [newCourseName, setNewCourseName] = useState('');
    const [showAddCourse, setShowAddCourse] = useState(false);

    // Transcript data
    const [transcriptCourses, setTranscriptCourses] = useState<TranscriptCourse[]>([]);
    const [loadingTranscript, setLoadingTranscript] = useState(true);
    const [hasTranscript, setHasTranscript] = useState(false);

    // GPA Calculator State
    const [previousCredits, setPreviousCredits] = useState<string>('');
    const [previousGPA, setPreviousGPA] = useState<string>('');
    const [gpaCalculatorCourses, setGpaCalculatorCourses] = useState<GPACalculatorCourse[]>([]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/auth');
            return;
        }
        loadCourses();
        loadTranscript();
    }, [authLoading, user, accessToken]);

    const loadCourses = async () => {
        if (accessToken) {
            try {
                const response = await fetch('/api/user/courses', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                const data = await response.json();
                if (data.courses?.length > 0) {
                    setCourses(data.courses);
                    return;
                }
            } catch (error) {
                console.error('Error loading courses from DB:', error);
            }
        }
        // Fallback to localStorage
        const savedCourses = localStorage.getItem('savedCourses');
        if (savedCourses) {
            const parsed = JSON.parse(savedCourses);
            setCourses(parsed);
        }
    };

    const loadTranscript = async () => {
        if (!accessToken || !user?.email) {
            setLoadingTranscript(false);
            return;
        }

        try {
            const response = await fetch(`/api/upload?userId=${encodeURIComponent(user.email)}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await response.json();

            if (data.hasTranscript && data.courses?.length > 0) {
                setTranscriptCourses(data.courses);
                setHasTranscript(true);

                // Get current semester courses (in-progress or most recent term)
                const currentCourses = data.courses.filter((c: TranscriptCourse) =>
                    c.grade === 'IP' ||
                    (data.courses.some((x: TranscriptCourse) => x.grade === 'IP') ? false :
                        c.term === data.courses[data.courses.length - 1].term)
                );

                // Initialize GPA calculator with current semester courses
                if (currentCourses.length > 0) {
                    const gpaCourses: GPACalculatorCourse[] = currentCourses.map((c: TranscriptCourse, i: number) => ({
                        id: `transcript-${i}`,
                        name: `${c.course} - ${c.description}`,
                        credits: c.credits,
                        expectedGrade: c.grade === 'IP' ? 'B' : c.grade,
                    }));
                    setGpaCalculatorCourses(gpaCourses);
                }

                // Calculate previous credits and GPA from completed courses
                // Retake logic:
                // - If original grade is C, D, or E: use the best grade, count credits once
                // - If original grade is B or better: average the grade points, count credits once
                const completedCourses = data.courses.filter((c: TranscriptCourse) =>
                    c.grade !== 'IP' && GRADE_POINTS[c.grade] !== undefined
                );

                if (completedCourses.length > 0) {
                    const goodGradeThreshold = 2.7; // B- or better
                    let totalCredits = 0;
                    let totalPoints = 0;

                    for (const course of completedCourses) {
                        if (course.grade === 'W') continue; // Skip withdrawals

                        const credits = course.credits;

                        if (course.isRetake && course.allGrades && course.allGrades.length > 1) {
                            // This is a retake - apply special logic
                            const allPoints = course.allGrades.map((g: string) => GRADE_POINTS[g] ?? 0);
                            const originalPoints = GRADE_POINTS[course.originalGrade || ''] ?? 0;

                            if (originalPoints < goodGradeThreshold) {
                                // Original grade was C, D, or E - use the BEST grade
                                const bestPoints = Math.max(...allPoints);
                                totalPoints += bestPoints * credits;
                            } else {
                                // Original grade was B or better - AVERAGE the points
                                const avgPoints = allPoints.reduce((sum: number, p: number) => sum + p, 0) / allPoints.length;
                                totalPoints += avgPoints * credits;
                            }
                            totalCredits += credits; // Count credits only once
                        } else {
                            // Normal course (not a retake)
                            totalPoints += (GRADE_POINTS[course.grade] || 0) * credits;
                            totalCredits += credits;
                        }
                    }

                    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

                    setPreviousCredits(totalCredits.toString());
                    setPreviousGPA(gpa.toFixed(2));
                }
            }
        } catch (error) {
            console.error('Error loading transcript:', error);
        } finally {
            setLoadingTranscript(false);
        }
    };

    const saveCourses = async (updatedCourses: Course[]) => {
        setCourses(updatedCourses);
        localStorage.setItem('savedCourses', JSON.stringify(updatedCourses));

        // Also save to Supabase
        if (accessToken) {
            try {
                await fetch('/api/user/courses', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ courses: updatedCourses }),
                });
            } catch (error) {
                console.error('Error saving courses to DB:', error);
            }
        }
    };

    const addNewCourse = () => {
        if (!newCourseName.trim()) return;

        const newCourse: Course = {
            id: String(Date.now()),
            name: newCourseName.trim(),
            components: [...DEFAULT_COMPONENTS.map(c => ({ ...c, id: String(Date.now()) + c.id }))],
        };

        const updatedCourses = [...courses, newCourse];
        saveCourses(updatedCourses);
        setSelectedCourse(newCourse);
        setNewCourseName('');
        setShowAddCourse(false);
    };

    const deleteCourse = (courseId: string) => {
        const updatedCourses = courses.filter(c => c.id !== courseId);
        saveCourses(updatedCourses);
        if (selectedCourse?.id === courseId) {
            setSelectedCourse(null);
        }
    };

    const updateComponent = (componentId: string, field: keyof GradeComponent, value: number | boolean | null) => {
        if (!selectedCourse) return;

        const updatedComponents = selectedCourse.components.map(c =>
            c.id === componentId ? { ...c, [field]: value } : c
        );

        const updatedCourse = { ...selectedCourse, components: updatedComponents };
        setSelectedCourse(updatedCourse);

        const updatedCourses = courses.map(c =>
            c.id === selectedCourse.id ? updatedCourse : c
        );
        saveCourses(updatedCourses);
    };

    const addComponent = () => {
        if (!selectedCourse) return;

        const newComponent: GradeComponent = {
            id: String(Date.now()),
            name: 'New Component',
            weight: 0,
            score: null,
            completed: false,
        };

        const updatedCourse = {
            ...selectedCourse,
            components: [...selectedCourse.components, newComponent],
        };
        setSelectedCourse(updatedCourse);

        const updatedCourses = courses.map(c =>
            c.id === selectedCourse.id ? updatedCourse : c
        );
        saveCourses(updatedCourses);
    };

    const updateComponentName = (componentId: string, name: string) => {
        if (!selectedCourse) return;

        const updatedComponents = selectedCourse.components.map(c =>
            c.id === componentId ? { ...c, name } : c
        );

        const updatedCourse = { ...selectedCourse, components: updatedComponents };
        setSelectedCourse(updatedCourse);

        const updatedCourses = courses.map(c =>
            c.id === selectedCourse.id ? updatedCourse : c
        );
        saveCourses(updatedCourses);
    };

    // GPA Calculator Functions
    const updateGPACourse = (id: string, field: 'expectedGrade' | 'credits', value: string | number) => {
        setGpaCalculatorCourses(prev =>
            prev.map(c => c.id === id ? { ...c, [field]: value } : c)
        );
    };

    const addGPACourse = () => {
        const newCourse: GPACalculatorCourse = {
            id: `new-${Date.now()}`,
            name: 'New Course',
            credits: 3,
            expectedGrade: 'B',
        };
        setGpaCalculatorCourses([...gpaCalculatorCourses, newCourse]);
    };

    const removeGPACourse = (id: string) => {
        setGpaCalculatorCourses(prev => prev.filter(c => c.id !== id));
    };

    const calculateCumulativeGPA = () => {
        const prevCredits = parseFloat(previousCredits) || 0;
        const prevGPA = parseFloat(previousGPA) || 0;
        const prevPoints = prevCredits * prevGPA;

        const currentCredits = gpaCalculatorCourses.reduce((sum, c) => sum + c.credits, 0);
        const currentPoints = gpaCalculatorCourses.reduce((sum, c) =>
            sum + (GRADE_POINTS[c.expectedGrade] || 0) * c.credits, 0);

        const totalCredits = prevCredits + currentCredits;
        const totalPoints = prevPoints + currentPoints;

        return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    };

    const calculateCurrentSemesterGPA = () => {
        const currentCredits = gpaCalculatorCourses.reduce((sum, c) => sum + c.credits, 0);
        const currentPoints = gpaCalculatorCourses.reduce((sum, c) =>
            sum + (GRADE_POINTS[c.expectedGrade] || 0) * c.credits, 0);

        return currentCredits > 0 ? (currentPoints / currentCredits).toFixed(2) : '0.00';
    };

    // Calculate grades for selected course
    const components = selectedCourse?.components || [];
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    const completedComponents = components.filter(c => c.completed && c.score !== null);
    const completedWeight = completedComponents.reduce((sum, c) => sum + c.weight, 0);
    const earnedPoints = completedComponents.reduce((sum, c) => sum + (c.score ?? 0), 0);
    const currentGrade = completedWeight > 0 ? (earnedPoints / completedWeight) * 100 : 0;
    const finalWeight = components.find(c => !c.completed)?.weight || 0;

    const calculateNeededScore = (targetPoints: number): number => {
        if (finalWeight === 0) return 0;
        const pointsNeeded = targetPoints - earnedPoints;
        return (pointsNeeded / finalWeight) * 100;
    };

    const getGradeColor = (needed: number): string => {
        if (needed <= 0) return '#22c55e';
        if (needed <= 60) return '#22c55e';
        if (needed <= 80) return '#eab308';
        if (needed <= 100) return '#f97316';
        return '#ef4444';
    };

    const getStatusText = (needed: number): string => {
        if (needed <= 0) return 'Already secured';
        if (needed > 100) return 'Additional support recommended';
        if (needed <= 60) return 'Very doable';
        if (needed <= 80) return 'Within reach';
        return 'Stay focused';
    };

    // Get current semester from transcript
    const currentSemesterCourses = transcriptCourses.filter(c => c.grade === 'IP');
    const totalCurrentCredits = gpaCalculatorCourses.reduce((sum, c) => sum + c.credits, 0);

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
                    <a href="/placements">My Courses</a>
                    <a href="/mentoring">Mentoring</a>
                </nav>
                <button className={styles.headerCta} onClick={() => router.push('/dashboard')}>
                    Back
                </button>
            </header>

            {/* HERO SECTION */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1>Calculate Your Grades</h1>
                    <p className={styles.heroSubtext}>
                        Track your progress, calculate final exam scores needed, and project your cumulative GPA.
                    </p>
                </div>
            </section>

            <main className={styles.main}>
                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>GPA</div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{previousGPA || '—'}</span>
                            <span className={styles.statLabel}>Current GPA</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>CRS</div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{currentSemesterCourses.length || gpaCalculatorCourses.length}</span>
                            <span className={styles.statLabel}>Current Courses</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>CR</div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{totalCurrentCredits}</span>
                            <span className={styles.statLabel}>Credits This Term</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>PRJ</div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{calculateCumulativeGPA()}</span>
                            <span className={styles.statLabel}>Projected GPA</span>
                        </div>
                    </div>
                </div>

                <div className={styles.welcomeCard}>
                    <h1>Hi {studentName}</h1>
                    <p>Track your grades, calculate what you need on finals, and project your GPA</p>
                </div>

                {/* GPA Calculator Section */}
                <section className={styles.gpaCalculatorSection}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionIcon}>GPA</div>
                        <div>
                            <h2>Cumulative GPA Calculator</h2>
                            <p>Calculate your projected cumulative GPA based on expected grades</p>
                        </div>
                    </div>

                    <div className={styles.gpaInputsGrid}>
                        <div className={styles.gpaInputCard}>
                            <label>Previous Credits</label>
                            <input
                                type="number"
                                value={previousCredits}
                                onChange={(e) => setPreviousCredits(e.target.value)}
                                placeholder="0"
                                min="0"
                                step="1"
                            />
                            <span className={styles.inputHint}>Total credits before this semester</span>
                        </div>
                        <div className={styles.gpaInputCard}>
                            <label>Previous GPA</label>
                            <input
                                type="number"
                                value={previousGPA}
                                onChange={(e) => setPreviousGPA(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                max="4"
                                step="0.01"
                            />
                            <span className={styles.inputHint}>Your GPA before this semester</span>
                        </div>
                    </div>

                    <div className={styles.currentCoursesSection}>
                        <h3>Current Semester Courses</h3>
                        {loadingTranscript ? (
                            <div className={styles.loadingState}>
                                <div className={styles.spinner}></div>
                                <p>Loading courses from transcript...</p>
                            </div>
                        ) : gpaCalculatorCourses.length === 0 ? (
                            <div className={styles.emptyGPACourses}>
                                <p>{hasTranscript ? 'No current semester courses found in transcript.' : 'No transcript uploaded. Add courses manually to calculate your GPA.'}</p>
                                <button onClick={addGPACourse} className={styles.addGPACourseBtn}>
                                    + Add Course Manually
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={styles.gpaCoursesTable}>
                                    <div className={styles.gpaCourseHeader}>
                                        <span>Course</span>
                                        <span>Credits</span>
                                        <span>Expected Grade</span>
                                        <span></span>
                                    </div>
                                    {gpaCalculatorCourses.map((course) => (
                                        <div key={course.id} className={styles.gpaCourseRow}>
                                            <span className={styles.gpaCourseName}>{course.name}</span>
                                            <input
                                                type="number"
                                                value={course.credits}
                                                onChange={(e) => updateGPACourse(course.id, 'credits', parseInt(e.target.value) || 0)}
                                                className={styles.gpaCreditsInput}
                                                min="0"
                                                max="12"
                                            />
                                            <select
                                                value={course.expectedGrade}
                                                onChange={(e) => updateGPACourse(course.id, 'expectedGrade', e.target.value)}
                                                className={styles.gpaGradeSelect}
                                            >
                                                {GRADE_OPTIONS.map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => removeGPACourse(course.id)}
                                                className={styles.removeCourseBtn}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addGPACourse} className={styles.addGPACourseBtn}>
                                    + Add Another Course
                                </button>
                            </>
                        )}
                    </div>

                    <div className={styles.gpaResultsGrid}>
                        <div className={styles.gpaResultCard}>
                            <span className={styles.gpaResultLabel}>Semester GPA</span>
                            <span className={styles.gpaResultValue}>{calculateCurrentSemesterGPA()}</span>
                        </div>
                        <div className={styles.gpaResultCard + ' ' + styles.gpaResultPrimary}>
                            <span className={styles.gpaResultLabel}>Projected Cumulative GPA</span>
                            <span className={styles.gpaResultValue}>{calculateCumulativeGPA()}</span>
                        </div>
                    </div>
                </section>

                {/* Course Grade Calculator Section */}
                <section className={styles.inputSection}>
                    <div className={styles.addCourseContainer}>
                        <h2>Grade Calculator</h2>
                        {showAddCourse ? (
                            <div className={styles.addCourseForm}>
                                <input
                                    type="text"
                                    value={newCourseName}
                                    onChange={(e) => setNewCourseName(e.target.value)}
                                    placeholder="e.g., MATH 464"
                                    className={styles.courseInput}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && addNewCourse()}
                                />
                                <button className={styles.saveBtn} onClick={addNewCourse}>Save</button>
                                <button className={styles.cancelBtn} onClick={() => setShowAddCourse(false)}>Cancel</button>
                            </div>
                        ) : (
                            <button
                                className={styles.addCourseBtn}
                                onClick={() => setShowAddCourse(true)}
                            >
                                + Add New Course
                            </button>
                        )}
                    </div>
                </section>

                {/* Course List Section */}
                {courses.length > 0 && (
                <section className={styles.inputSection}>
                    <h2>Your Saved Courses</h2>
                        <div className={styles.coursesList}>
                            {courses.map((course) => {
                                const courseComponents = course.components;
                                const compWeight = courseComponents.filter(c => c.completed && c.score !== null).reduce((sum, c) => sum + c.weight, 0);
                                const earned = courseComponents.filter(c => c.completed && c.score !== null).reduce((sum, c) => sum + (c.score ?? 0), 0);
                                const grade = compWeight > 0 ? (earned / compWeight) * 100 : 0;
                                const isExpanded = selectedCourse?.id === course.id;

                                return (
                                    <div
                                        key={course.id}
                                        className={`${styles.courseItemRow} ${isExpanded ? styles.expanded : ''}`}
                                    >
                                        {/* Course header with name and grade */}
                                        <div
                                            className={styles.courseHeaderRow}
                                            onClick={() => setSelectedCourse(isExpanded ? null : course)}
                                        >
                                            <div className={styles.courseNameSection}>
                                                <span className={styles.expandIcon}>
                                                    {isExpanded ? '▼' : '▶'}
                                                </span>
                                                <span className={styles.courseName}>{course.name}</span>
                                            </div>
                                            <div className={styles.gradeSection}>
                                                <span className={styles.finalGrade}>{grade.toFixed(1)}%</span>
                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteCourse(course.id);
                                                    }}
                                                    title="Delete course"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>

                                        {/* Subsections (components) */}
                                        {isExpanded && (
                                            <div className={styles.subsectionsContainer}>
                                                {courseComponents.map((comp) => (
                                                    <div key={comp.id} className={styles.subsectionRow}>
                                                        <div className={styles.subsectionName}>
                                                            <input
                                                                type="text"
                                                                value={comp.name}
                                                                onChange={(e) => updateComponentName(comp.id, e.target.value)}
                                                                className={styles.subsectionNameInput}
                                                            />
                                                        </div>
                                                        <div className={styles.subsectionDetails}>
                                                            <div className={styles.subsectionField}>
                                                                <label>Weight: </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={comp.weight}
                                                                    onChange={(e) => updateComponent(comp.id, 'weight', Number(e.target.value))}
                                                                    className={styles.subsectionInput}
                                                                />
                                                                <span>%</span>
                                                            </div>
                                                            <div className={styles.subsectionField}>
                                                                <label>Score: </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={comp.weight}
                                                                    step="0.1"
                                                                    value={comp.score ?? ''}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value === '' ? null : Number(e.target.value);
                                                                        updateComponent(comp.id, 'score', value);
                                                                    }}
                                                                    disabled={!comp.completed}
                                                                    placeholder="Enter"
                                                                    className={styles.subsectionInput}
                                                                />
                                                                <span>pts</span>
                                                            </div>
                                                            <div className={styles.subsectionField}>
                                                                <label className={styles.checkboxLabel}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={comp.completed}
                                                                        onChange={(e) => updateComponent(comp.id, 'completed', e.target.checked)}
                                                                    />
                                                                    Done
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button className={styles.addSubsectionBtn} onClick={addComponent}>
                                                    + Add Component
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                </section>
                )}

                {/* Grade Calculator for Selected Course */}
                {selectedCourse && (
                    <>
                        <section className={styles.inputSection}>
                            <h2>{selectedCourse.name} - Grade Components</h2>
                            <p className={styles.hint}>
                                Total weight should equal 100%. Current: <strong>{totalWeight}%</strong>
                                {totalWeight !== 100 && <span className={styles.warning}> (adjust weights!)</span>}
                            </p>

                            <div className={styles.componentsList}>
                                {components.map((comp) => (
                                    <div key={comp.id} className={styles.componentRow}>
                                        <div className={styles.componentName}>
                                            <input
                                                type="text"
                                                value={comp.name}
                                                onChange={(e) => updateComponentName(comp.id, e.target.value)}
                                                className={styles.nameInput}
                                            />
                                        </div>
                                        <div className={styles.componentWeight}>
                                            <label>Weight %</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={comp.weight}
                                                onChange={(e) => updateComponent(comp.id, 'weight', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className={styles.componentScore}>
                                            <label>Points</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={comp.weight}
                                                step="0.1"
                                                value={comp.score ?? ''}
                                                onChange={(e) => {
                                                    const value = e.target.value === '' ? null : Number(e.target.value);
                                                    updateComponent(comp.id, 'score', value);
                                                }}
                                                disabled={!comp.completed}
                                                placeholder="Enter score"
                                            />
                                        </div>
                                        <div className={styles.componentCompleted}>
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={comp.completed}
                                                    onChange={(e) => updateComponent(comp.id, 'completed', e.target.checked)}
                                                />
                                                Completed
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className={styles.addBtn} onClick={addComponent}>
                                + Add Component
                            </button>
                        </section>

                        {/* Results Section */}
                        <section className={styles.resultsSection}>
                            <h2>{selectedCourse.name} - Grade Analysis</h2>

                            <div className={styles.currentGrade}>
                                <div className={styles.gradeCircle}>
                                    <span className={styles.gradeNumber}>{currentGrade.toFixed(1)}%</span>
                                    <span className={styles.gradeLabel}>Current Grade</span>
                                </div>
                                <p>Based on {completedWeight}% of coursework completed</p>
                            </div>

                            <h3>What You Need on the Final ({finalWeight}% of grade)</h3>

                            <div className={styles.targetGrid}>
                                {GRADE_THRESHOLDS.map((threshold) => {
                                    const neededPercent = calculateNeededScore(threshold.min);
                                    const rawPointsNeeded = threshold.min - earnedPoints;
                                    const hasScores = earnedPoints > 0;

                                    return (
                                        <div
                                            key={threshold.grade}
                                            className={styles.targetCard}
                                            style={{ borderColor: hasScores ? getGradeColor(neededPercent) : '#ddd' }}
                                        >
                                            <div className={styles.targetGrade}>{threshold.grade}</div>
                                            <div className={styles.targetMin}>{threshold.min}+</div>

                                            {hasScores ? (
                                                <>
                                                    <div
                                                        className={styles.neededScore}
                                                        style={{ color: getGradeColor(neededPercent) }}
                                                    >
                                                        {rawPointsNeeded <= 0
                                                            ? '0'
                                                            : rawPointsNeeded > finalWeight
                                                                ? `>${finalWeight}`
                                                                : rawPointsNeeded.toFixed(1)
                                                        } / {finalWeight} pts
                                                    </div>
                                                    <div className={styles.neededPercent}>
                                                        ({neededPercent <= 0
                                                            ? '0%'
                                                            : neededPercent > 100
                                                                ? '>100%'
                                                                : `${neededPercent.toFixed(1)}%`
                                                        } on final)
                                                    </div>
                                                    <div className={styles.statusText}>{getStatusText(neededPercent)}</div>
                                                </>
                                            ) : (
                                                <div className={styles.enterScores}>Enter your scores above</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                )}


            </main>
        </div>
    );
}
