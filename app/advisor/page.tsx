'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/advisor.module.css';
import ApiKeyInput from '../components/ApiKeyInput';
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
    { text: 'Create a 4-year graduation plan' },
    { text: 'Which batch is right for me?' },
];

export default function AdvisorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState('');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [showApiKeySettings, setShowApiKeySettings] = useState(false);
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [studentContext, setStudentContext] = useState('');
    const [hasTranscript, setHasTranscript] = useState<boolean | null>(null);

    useEffect(() => {
        const initializeAdvisor = async () => {
            const name = localStorage.getItem('studentName');
            if (!name) {
                router.push('/');
                return;
            }
            const cleanName = name.startsWith('Student ') ? name.replace('Student ', '') : name;
            setStudentName(cleanName);

            // Check for saved API key
            const savedKey = localStorage.getItem('openai_api_key');
            setHasApiKey(!!savedKey);

            // Try to load transcript data
            const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail');
            if (userId) {
                try {
                    const response = await fetch(`/api/upload?userId=${encodeURIComponent(userId)}`);
                    const data = await response.json();

                    if (data.hasTranscript && data.courses?.length > 0) {
                        setHasTranscript(true);

                        // Build student context string from transcript
                        const courses: TranscriptCourse[] = data.courses;
                        const completedCourses = courses.filter(c => c.grade !== 'IP');
                        const inProgressCourses = courses.filter(c => c.grade === 'IP');
                        const uniqueTerms = [...new Set(courses.map(c => c.term))];
                        const totalCredits = completedCourses.reduce((s, c) => s + c.credits, 0);

                        const yearLabels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
                        const yearIndex = Math.min(Math.floor(uniqueTerms.length / 2), 3);
                        const yearLabel = yearLabels[yearIndex];

                        let ctx = `Name: ${cleanName}\n`;
                        ctx += `Standing: ${yearLabel} (${uniqueTerms.length} semesters completed)\n`;
                        ctx += `Completed Courses: ${completedCourses.length} (${totalCredits} credits)\n\n`;
                        ctx += `COMPLETED COURSES:\n`;
                        for (const c of completedCourses) {
                            ctx += `  ${c.course}: ${c.description} (Grade: ${c.grade}, ${c.credits} credits, ${c.term})\n`;
                        }
                        if (inProgressCourses.length > 0) {
                            ctx += `\nIN PROGRESS:\n`;
                            for (const c of inProgressCourses) {
                                ctx += `  ${c.course}: ${c.description} (${c.credits} credits, ${c.term})\n`;
                            }
                        }

                        setStudentContext(ctx);

                        setWelcomeMessage(
                            `Hello ${cleanName}! I'm your AI Academic Advisor, powered by real course data from the University of Arizona.\n\n` +
                            `I can see from your transcript that you're a ${yearLabel} with ${completedCourses.length} completed courses (${totalCredits} credits).` +
                            (inProgressCourses.length > 0 ? `\nYou're currently enrolled in: ${inProgressCourses.map(c => c.course).join(', ')}` : '') +
                            `\n\nI can help you with:\n• Planning your next semester\n• Understanding prerequisites\n• Course recommendations based on your transcript\n• Creating a personalized graduation timeline\n\nWhat would you like to explore today?`
                        );
                    } else {
                        setHasTranscript(false);
                        setWelcomeMessage(
                            `Hello ${cleanName}! I'm your AI Academic Advisor, powered by real course data from the University of Arizona.\n\n` +
                            `I notice you haven't uploaded your transcript yet. To provide personalized course recommendations and accurate planning, I'll need access to your academic history.\n\n` +
                            `Please upload your transcript on the My Courses page to get started, or feel free to ask general questions about courses and prerequisites.`
                        );
                    }
                } catch (error) {
                    console.error('Error loading transcript:', error);
                    setHasTranscript(false);
                    setWelcomeMessage(
                        `Hello ${cleanName}! I'm your AI Academic Advisor.\n\n` +
                        `I can help you with:\n• Planning your next semester\n• Understanding prerequisites\n• Course recommendations\n• Creating a graduation timeline\n\nWhat would you like to explore today?`
                    );
                }
            } else {
                setHasTranscript(false);
                setWelcomeMessage(
                    `Hello ${cleanName}! I'm your AI Academic Advisor.\n\n` +
                    `I can help you with course planning, prerequisites, and graduation timelines.\n\nWhat would you like to explore today?`
                );
            }

            setLoading(false);
        };

        initializeAdvisor();
    }, [router]);

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.logo}>
                        <div className={styles.logoMark}>PM</div>
                        <span className={styles.logoText}>AI Advisor</span>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <button
                        className={styles.backButton}
                        onClick={() => setShowApiKeySettings(!showApiKeySettings)}
                        style={{
                            background: hasApiKey ? 'rgba(5, 150, 105, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                            borderColor: hasApiKey ? 'rgba(5, 150, 105, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                        }}
                    >
                        {hasApiKey ? '🔑 API Key Set' : '⚙️ Set API Key'}
                    </button>
                    <button className={styles.backButton} onClick={() => router.push('/dashboard')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Dashboard
                    </button>
                </div>
            </header>

            {/* Main Chat Area */}
            <main className={styles.main}>
                <div className={styles.chatContainer}>
                    {/* API Key Settings Banner */}
                    {showApiKeySettings && (
                        <div style={{ padding: '0 0 12px 0' }}>
                            <ApiKeyInput onKeyChange={(has) => setHasApiKey(has)} />
                            <p style={{
                                fontSize: '0.75rem',
                                color: '#9ca3af',
                                marginTop: '6px',
                                paddingLeft: '4px',
                            }}>
                                Your API key is stored only in your browser&apos;s localStorage — never sent to our server for storage.
                            </p>
                        </div>
                    )}

                    {/* No API key warning */}
                    {!hasApiKey && !showApiKeySettings && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(234, 179, 8, 0.08)',
                            border: '1px solid rgba(234, 179, 8, 0.2)',
                            borderRadius: '10px',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.85rem',
                        }}>
                            <span>⚠️</span>
                            <span>Set your OpenAI API key to use the AI advisor.</span>
                            <button
                                onClick={() => setShowApiKeySettings(true)}
                                style={{
                                    marginLeft: 'auto',
                                    background: '#002147',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 14px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                }}
                            >
                                Set Key
                            </button>
                        </div>
                    )}

                    {/* Transcript Upload Banner */}
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
                                    <span>Get personalized course recommendations based on your academic history</span>
                                </div>
                                <button
                                    className={styles.transcriptBannerBtn}
                                    onClick={() => router.push('/placements')}
                                >
                                    Upload Transcript
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Quick Prompts - shown initially */}
                    {welcomeMessage && (
                        <div style={{ marginBottom: '8px' }}>
                            <div className={styles.quickPrompts}>
                                <div className={styles.quickPromptsLabel}>Suggested Questions</div>
                                <div className={styles.promptsGrid}>
                                    {QUICK_PROMPTS.map((prompt, index) => (
                                        <button
                                            key={index}
                                            className={styles.promptButton}
                                            onClick={() => {
                                                // The AdvisorChat handles sending
                                                const textarea = document.querySelector(`.${styles.textInput}`) as HTMLTextAreaElement;
                                                if (textarea) {
                                                    // Set the value and trigger change
                                                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                                                        window.HTMLTextAreaElement.prototype, 'value'
                                                    )?.set;
                                                    nativeInputValueSetter?.call(textarea, prompt.text);
                                                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                                                    textarea.dispatchEvent(new Event('change', { bubbles: true }));
                                                    // Focus and submit
                                                    textarea.focus();
                                                    setTimeout(() => {
                                                        textarea.dispatchEvent(new KeyboardEvent('keypress', {
                                                            key: 'Enter',
                                                            bubbles: true,
                                                        }));
                                                    }, 100);
                                                }
                                            }}
                                        >
                                            {prompt.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advisor Chat Component */}
                    <AdvisorChat
                        studentName={studentName}
                        welcomeMessage={welcomeMessage}
                        studentContext={studentContext}
                    />
                </div>
            </main>
        </div>
    );
}
