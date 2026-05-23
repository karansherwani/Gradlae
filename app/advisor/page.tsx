'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/advisor.module.css';
import AdvisorChat from '../components/AdvisorChat';

interface TranscriptCourse {
    course: string;
    description: string;
    grade: string;
    credits: number;
    term: string;
}

const QUICK_PROMPTS = [
    { text: 'Help me plan my next semester' },
    { text: 'What prerequisites do I need for CS courses?' },
    { text: 'Recommend courses for my major' },
    { text: 'Create a graduation plan for me' },
    { text: 'How many credits do I still need?' },
];

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

// ─── Credit helpers (same logic as in AdvisorChat) ──────────────────────
function computeCorrectedCredits(courses: TranscriptCourse[]) {
    const passing = courses.filter(c => c.grade !== 'W' && c.grade !== 'IP');
    const seen = new Map<string, TranscriptCourse>();
    for (const c of passing) {
        const key = c.course.trim().toUpperCase();
        if (!seen.has(key)) {
            seen.set(key, c);
        }
    }
    const unique = Array.from(seen.values());
    const earnedCredits = unique.reduce((s, c) => s + c.credits, 0);
    const inProgress = courses.filter(c => c.grade === 'IP');
    const ipCredits = inProgress.reduce((s, c) => s + c.credits, 0);

    return { earnedCredits, uniqueCompleted: unique, inProgress, ipCredits };
}

function buildTranscriptContext(
    courses: TranscriptCourse[],
    studentName: string,
): string {
    const { earnedCredits, uniqueCompleted, inProgress, ipCredits } = computeCorrectedCredits(courses);

    const allTerms = [...new Set(courses.map(c => c.term))];
    const semesterCount = allTerms.length;

    // Standing based on earned credits
    let standing: string;
    if (earnedCredits >= 90) standing = 'Senior';
    else if (earnedCredits >= 60) standing = 'Junior';
    else if (earnedCredits >= 30) standing = 'Sophomore';
    else standing = 'Freshman';

    let ctx = `Name: ${studentName}\n`;
    ctx += `Completed Semesters: ${semesterCount}\n`;
    ctx += `Academic Standing: ${standing} (based on ${earnedCredits} earned credits)\n`;
    ctx += `Earned Credits: ${earnedCredits} (unique passed courses, excludes W and duplicate attempts)\n`;
    if (ipCredits > 0) {
        ctx += `In-Progress Credits: ${ipCredits} (not counted in earned total)\n`;
    }
    ctx += `\nCOMPLETED COURSES (${uniqueCompleted.length} unique):\n`;
    for (const c of uniqueCompleted) {
        ctx += `  ${c.course}: ${c.description} (Grade: ${c.grade}, ${c.credits} cr, ${c.term})\n`;
    }
    if (inProgress.length > 0) {
        ctx += `\nIN-PROGRESS COURSES:\n`;
        for (const c of inProgress) {
            ctx += `  ${c.course}: ${c.description} (${c.credits} cr, ${c.term})\n`;
        }
    }

    return ctx;
}

export default function AdvisorPage() {
    const router = useRouter();
    const { user, dbUser, accessToken, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [studentContext, setStudentContext] = useState('');
    const [hasTranscript, setHasTranscript] = useState<boolean | null>(null);

    const studentName = dbUser?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    const cleanName = studentName.startsWith('Student ') ? studentName.replace('Student ', '') : studentName;
    const displayName = cleanName || 'there';

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/auth');
            return;
        }

        const initializeAdvisor = async () => {
            if (!accessToken) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/upload?userId=${encodeURIComponent(user.email || '')}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                const data = await response.json();

                if (data.hasTranscript && data.courses?.length > 0) {
                    setHasTranscript(true);

                    const courses: TranscriptCourse[] = data.courses;
                    const ctx = buildTranscriptContext(courses, cleanName);
                    setStudentContext(ctx);

                    // Use corrected credit numbers for welcome message
                    const { earnedCredits, uniqueCompleted, inProgress } = computeCorrectedCredits(courses);
                    const allTerms = [...new Set(courses.map(c => c.term))];
                    const semesterCount = allTerms.length;

                    let standing: string;
                    if (earnedCredits >= 90) standing = 'Senior';
                    else if (earnedCredits >= 60) standing = 'Junior';
                    else if (earnedCredits >= 30) standing = 'Sophomore';
                    else standing = 'Freshman';

                    setWelcomeMessage(
                        `Hello ${cleanName}! I'm your AI Academic Advisor, powered by real course data from the University of Arizona.\n\n` +
                        `From your transcript: you're a ${standing} (semester ${semesterCount}) with ${uniqueCompleted.length} completed courses and ${earnedCredits} earned credits.` +
                        (inProgress.length > 0 ? `\nCurrently enrolled in: ${inProgress.map(c => c.course).join(', ')}` : '') +
                        `\n\nI can help you with:\n- Planning your next semester\n- Understanding prerequisites\n- Course recommendations based on your transcript\n- Creating a personalized graduation timeline\n\nWhat would you like to explore today?`
                    );
                } else {
                    setHasTranscript(false);
                    setWelcomeMessage(
                        `Hello ${cleanName}! I'm your AI Academic Advisor, powered by real course data from the University of Arizona.\n\n` +
                        `I don't have your transcript yet. You can upload it here using the attachment button below, or on the My Courses page.\n\n` +
                        `With your transcript I can give you personalized advice about remaining requirements, credit counts, and graduation planning.\n\n` +
                        `Feel free to ask general questions about courses and prerequisites in the meantime!`
                    );
                }
            } catch (error) {
                console.error('Error loading transcript:', error);
                setHasTranscript(false);
                setWelcomeMessage(
                    `Hello ${cleanName}! I'm your AI Academic Advisor.\n\n` +
                    `Upload your transcript with the attachment button below for personalized advice, or ask me general questions about courses and planning!`
                );
            }

            setLoading(false);
        };

        initializeAdvisor();
    }, [authLoading, user, accessToken, cleanName, router]);

    // Called when AdvisorChat parses a new transcript
    const handleTranscriptParsed = (ctx: string) => {
        setStudentContext(ctx);
        setHasTranscript(true);
    };

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logo} onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
                    <img src="/gradlae-logo.png" alt="Gradlae" className="brandLogo" />
                </div>

                <div className={styles.sidebarSection}>
                    <p className={styles.sidebarLabel}>Past Conversations</p>
                    <nav className={styles.sideNav} aria-label="Past conversations">
                        <button className={`${styles.sideNavItem} ${styles.sideNavItemActive}`}>Today&apos;s academic plan</button>
                        <button className={styles.sideNavItem}>Credits remaining</button>
                        <button className={styles.sideNavItem}>Prerequisite check</button>
                        <button className={styles.sideNavItem}>Graduation timeline</button>
                    </nav>
                </div>

                <div className={styles.sidebarFooter}>
                    <span>{displayName.charAt(0).toUpperCase()}</span>
                    <strong>{displayName}</strong>
                </div>
            </header>

            <main className={styles.main}>
                <button className={styles.topBackButton} onClick={() => router.push('/dashboard')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Dashboard
                </button>

                <section className={styles.advisorHero}>
                    <div>
                        <p className={styles.heroLabel}>AI Academic Advisor</p>
                        <h1>{getGreeting()}, {displayName}</h1>
                        <p>
                            Ask about prerequisites, remaining credits, transcript details, or graduation timelines using the same Gradlae data that powers your dashboard.
                        </p>
                    </div>
                    <div className={styles.heroStats}>
                        <span>Transcript-aware</span>
                        <span>UofA course data</span>
                        <span>PDF uploads</span>
                    </div>
                </section>
                <div className={styles.chatContainer}>
                    {hasTranscript === false && (
                        <div className={styles.transcriptBanner}>
                            <div className={styles.transcriptBannerContent}>
                                <div className={styles.transcriptBannerIcon}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14,2 14,8 20,8" />
                                        <line x1="12" y1="18" x2="12" y2="12" />
                                        <line x1="9" y1="15" x2="15" y2="15" />
                                    </svg>
                                </div>
                                <div className={styles.transcriptBannerText}>
                                    <strong>Upload Your Transcript</strong>
                                    <span>Use the attachment button below or upload on the My Courses page for personalized advice</span>
                                </div>
                                <button
                                    className={styles.transcriptBannerBtn}
                                    onClick={() => router.push('/placements')}
                                >
                                    Go to My Courses
                                </button>
                            </div>
                        </div>
                    )}

                    <AdvisorChat
                        studentName={cleanName}
                        welcomeMessage={welcomeMessage}
                        studentContext={studentContext}
                        onTranscriptParsed={handleTranscriptParsed}
                    />

                    {welcomeMessage && (
                        <div className={styles.quickPrompts}>
                            <div className={styles.promptsGrid}>
                                {QUICK_PROMPTS.map((prompt, index) => (
                                    <button
                                        key={index}
                                        className={styles.promptButton}
                                        onClick={() => {
                                            window.dispatchEvent(new CustomEvent('advisor-prompt', { detail: prompt.text }));
                                        }}
                                    >
                                        {prompt.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
