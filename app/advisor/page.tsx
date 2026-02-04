'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/advisor.module.css';
import { StudentProfile, CompletedCourse } from '@/types';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const QUICK_PROMPTS = [
    { icon: '📅', text: 'Help me plan my next semester' },
    { icon: '📚', text: 'What prerequisites do I need for CS courses?' },
    { icon: '🎯', text: 'Recommend courses for my major' },
    { icon: '🎓', text: 'Create a 4-year graduation plan' },
    { icon: '⏱️', text: 'Which batch is right for me?' },
];

// Mock student profile - in production, fetch from user session/database
function getMockStudentProfile(studentName: string): StudentProfile {
    const completedCourses: CompletedCourse[] = [
        { courseId: 'CSC-101', courseName: 'Introduction to Computer Science', grade: 'A', units: 3, semester: 'Fall 2025', term: 'Fall', year: 2025 },
        { courseId: 'CSC-110', courseName: 'Programming I', grade: 'A-', units: 4, semester: 'Fall 2025', term: 'Fall', year: 2025 },
        { courseId: 'MATH-122A', courseName: 'Calculus I', grade: 'B+', units: 3, semester: 'Fall 2025', term: 'Fall', year: 2025 },
        { courseId: 'ENGL-101', courseName: 'Composition', grade: 'A', units: 3, semester: 'Fall 2025', term: 'Fall', year: 2025 },
    ];

    return {
        id: '1',
        name: studentName,
        email: `${studentName.toLowerCase().replace(' ', '.')}@arizona.edu`,
        major: 'Computer Science',
        degreePlanId: 'cs-bs-2025',
        startYear: 2025,
        startTerm: 'Fall',
        currentSemester: 2,
        completedCourses,
        interests: ['Machine Learning', 'Web Development'],
        careerGoals: 'Software Engineer at a tech company'
    };
}

export default function AdvisorPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState('');
    const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const name = localStorage.getItem('studentName');
        if (!name) {
            router.push('/');
            return;
        }
        const cleanName = name.startsWith('Student ') ? name.replace('Student ', '') : name;
        setStudentName(cleanName);

        // Initialize student profile
        const profile = getMockStudentProfile(cleanName);
        setStudentProfile(profile);

        // Add initial welcome message
        const welcomeMessage: Message = {
            id: 'welcome',
            role: 'assistant',
            content: `Hello ${cleanName}! 👋 I'm your AI Academic Advisor. I'm here to help you plan your academic journey at University of Arizona.\n\nI can help you with:\n• Planning your next semester\n• Understanding prerequisites\n• Course recommendations\n• Creating a graduation timeline\n\nWhat would you like to explore today?`,
            timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        setLoading(false);
    }, [router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSendMessage = async (content: string) => {
        if (!content.trim() || !studentProfile) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: content.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        try {
            // Prepare messages for API
            const chatMessages = [...messages, userMessage].map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }));

            // Call the chat API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: chatMessages,
                    studentProfile: studentProfile
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }

            const data = await response.json();

            const aiResponse: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.message,
                timestamp: new Date(),
            };

            setIsTyping(false);
            setMessages(prev => [...prev, aiResponse]);

        } catch (error) {
            console.error('Error sending message:', error);
            setIsTyping(false);
            
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(inputValue);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backButton} onClick={() => router.push('/dashboard')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Dashboard
                    </button>
                    <div className={styles.logo}>
                        <div className={styles.logoMark}>PM</div>
                        <span className={styles.logoText}>AI Advisor</span>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.statusIndicator}>
                        <span className={styles.statusDot}></span>
                        AI Online
                    </div>
                </div>
            </header>

            {/* Main Chat Area */}
            <main className={styles.main}>
                <div className={styles.chatContainer}>
                    {/* Messages */}
                    <div className={styles.messagesArea}>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`${styles.message} ${message.role === 'assistant' ? styles.messageAi : styles.messageUser}`}
                            >
                                <div className={`${styles.avatar} ${message.role === 'assistant' ? styles.avatarAi : styles.avatarUser}`}>
                                    {message.role === 'assistant' ? '🤖' : studentName.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.messageContent}>
                                    <div className={`${styles.messageBubble} ${message.role === 'assistant' ? styles.messageBubbleAi : styles.messageBubbleUser}`}>
                                        {message.content.split('\n').map((line, i) => (
                                            <span key={i}>
                                                {line}
                                                {i < message.content.split('\n').length - 1 && <br />}
                                            </span>
                                        ))}
                                    </div>
                                    <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className={styles.typingIndicator}>
                                <div className={`${styles.avatar} ${styles.avatarAi}`}>🤖</div>
                                <div className={styles.typingBubble}>
                                    <span className={styles.typingDot}></span>
                                    <span className={styles.typingDot}></span>
                                    <span className={styles.typingDot}></span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Prompts */}
                    {messages.length <= 1 && (
                        <div className={styles.quickPrompts}>
                            <div className={styles.quickPromptsLabel}>Suggested Questions</div>
                            <div className={styles.promptsGrid}>
                                {QUICK_PROMPTS.map((prompt, index) => (
                                    <button
                                        key={index}
                                        className={styles.promptButton}
                                        onClick={() => handleSendMessage(prompt.text)}
                                    >
                                        <span className={styles.promptIcon}>{prompt.icon}</span>
                                        {prompt.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className={styles.inputArea}>
                        <div className={styles.inputWrapper}>
                            <textarea
                                className={styles.textInput}
                                placeholder="Ask me about course planning, prerequisites, or graduation..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                rows={1}
                            />
                            <button
                                className={styles.sendButton}
                                onClick={() => handleSendMessage(inputValue)}
                                disabled={!inputValue.trim() || isTyping}
                            >
                                <svg className={styles.sendIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                </svg>
                            </button>
                        </div>
                        <p className={styles.footerHint}>
                            Press Enter to send • Powered by AI
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
