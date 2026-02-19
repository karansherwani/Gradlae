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

// Build student profile from transcript data
function buildStudentProfileFromTranscript(
    studentName: string,
    transcriptCourses: TranscriptCourse[]
): StudentProfile {
    // Convert transcript courses to CompletedCourse format
    const completedCourses: CompletedCourse[] = transcriptCourses
        .filter(c => c.grade !== 'IP') // Exclude in-progress courses
        .map(c => {
            // Parse term to get semester info
            const termParts = c.term.split(' ');
            const term = termParts[0] as 'Fall' | 'Spring' | 'Summer' | 'Winter';
            const year = parseInt(termParts[1]) || 2025;

            return {
                courseId: c.course,
                courseName: c.description,
                grade: c.grade,
                units: c.credits,
                semester: c.term,
                term,
                year
            };
        });

    // Determine current semester based on transcript data
    const allTerms = transcriptCourses.map(c => c.term);
    const uniqueTerms = [...new Set(allTerms)];
    const currentSemester = uniqueTerms.length + 1; // Next semester

    // Determine start year from earliest term
    const years = transcriptCourses.map(c => {
        const parts = c.term.split(' ');
        return parseInt(parts[1]) || 2025;
    });
    const startYear = years.length > 0 ? Math.min(...years) : 2025;

    return {
        id: '1',
        name: studentName,
        email: `${studentName.toLowerCase().replace(' ', '.')}@arizona.edu`,
        major: 'Computer Science',
        degreePlanId: 'cs-bs-2025',
        startYear,
        startTerm: 'Fall',
        currentSemester,
        completedCourses,
        interests: ['Software Development'],
        careerGoals: 'Software Engineer'
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
    const [hasTranscript, setHasTranscript] = useState<boolean | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const initializeAdvisor = async () => {
            const name = localStorage.getItem('studentName');
            if (!name) {
                router.push('/');
                return;
            }
            const cleanName = name.startsWith('Student ') ? name.replace('Student ', '') : name;
            setStudentName(cleanName);

            // Try to load transcript data
            const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail');
            if (userId) {
                try {
                    const response = await fetch(`/api/upload?userId=${encodeURIComponent(userId)}`);
                    const data = await response.json();

                    if (data.hasTranscript && data.courses?.length > 0) {
                        // Build profile from transcript
                        const profile = buildStudentProfileFromTranscript(cleanName, data.courses);
                        setStudentProfile(profile);
                        setHasTranscript(true);

                        // Calculate year based on completed semesters
                        const yearLabels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
                        const yearIndex = Math.min(Math.floor((profile.currentSemester - 1) / 2), 3);
                        const yearLabel = yearLabels[yearIndex];

                        // Add welcome message with transcript context
                        const welcomeMessage: Message = {
                            id: 'welcome',
                            role: 'assistant',
                            content: `Hello ${cleanName}! I'm your AI Academic Advisor. I'm here to help you plan your academic journey at University of Arizona.\n\nI can see from your transcript that you're a ${yearLabel} with ${profile.completedCourses.length} completed courses.\n\nI can help you with:\n• Planning your next semester\n• Understanding prerequisites\n• Course recommendations\n• Creating a graduation timeline\n\nWhat would you like to explore today?`,
                            timestamp: new Date(),
                        };
                        setMessages([welcomeMessage]);
                    } else {
                        setHasTranscript(false);
                        // No transcript - show upload prompt
                        const welcomeMessage: Message = {
                            id: 'welcome',
                            role: 'assistant',
                            content: `Hello ${cleanName}! I'm your AI Academic Advisor. I'm here to help you plan your academic journey at University of Arizona.\n\nI notice you haven't uploaded your transcript yet. To provide personalized course recommendations and accurate planning, I'll need access to your academic history.\n\nPlease upload your transcript on the My Courses page to get started, or feel free to ask general questions about courses and prerequisites.`,
                            timestamp: new Date(),
                        };
                        setMessages([welcomeMessage]);
                        setStudentProfile(null);
                    }
                } catch (error) {
                    console.error('Error loading transcript:', error);
                    setHasTranscript(false);
                    const welcomeMessage: Message = {
                        id: 'welcome',
                        role: 'assistant',
                        content: `Hello ${cleanName}! I'm your AI Academic Advisor. I'm here to help you plan your academic journey at University of Arizona.\n\nI can help you with:\n• Planning your next semester\n• Understanding prerequisites\n• Course recommendations\n• Creating a graduation timeline\n\nWhat would you like to explore today?`,
                        timestamp: new Date(),
                    };
                    setMessages([welcomeMessage]);
                }
            } else {
                setHasTranscript(false);
            }

            setLoading(false);
        };

        initializeAdvisor();
    }, [router]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSendMessage = async (content: string) => {
        if (!content.trim()) return;

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

            // Use student profile if available, otherwise create a basic one
            const profileToSend = studentProfile || {
                id: '1',
                name: studentName,
                email: `${studentName.toLowerCase().replace(' ', '.')}@arizona.edu`,
                major: 'Computer Science',
                degreePlanId: 'cs-bs-2025',
                startYear: 2025,
                startTerm: 'Fall',
                currentSemester: 1,
                completedCourses: [],
                interests: [],
                careerGoals: ''
            };

            // Call the chat API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: chatMessages,
                    studentProfile: profileToSend
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

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    // Handle sending message with optional file attachment
    const handleSendWithFile = async () => {
        if (!inputValue.trim() && !selectedFile) return;

        // If there's a file, process it first
        if (selectedFile) {
            setUploadingFile(true);

            try {
                const formData = new FormData();
                formData.append('file', selectedFile);

                const userId = localStorage.getItem('userId') || localStorage.getItem('userEmail') || 'demo-user';
                formData.append('userId', userId);

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                const uploadData = await uploadResponse.json();

                if (uploadResponse.ok && uploadData.courses?.length > 0) {
                    // Build profile from uploaded transcript
                    const profile = buildStudentProfileFromTranscript(studentName, uploadData.courses);
                    setStudentProfile(profile);
                    setHasTranscript(true);

                    // Find in-progress courses for the current semester
                    const inProgressCourses = uploadData.courses.filter((c: TranscriptCourse) => c.grade === 'IP');
                    const currentTermCourses = inProgressCourses.length > 0
                        ? inProgressCourses.map((c: TranscriptCourse) => c.course).join(', ')
                        : 'None';

                    // Calculate year standing
                    const yearLabels = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
                    const yearIndex = Math.min(Math.floor((profile.currentSemester - 1) / 2), 3);
                    const yearLabel = yearLabels[yearIndex];

                    // Build informative message
                    let confirmMessage = `I've successfully analyzed your transcript.\n\n`;
                    confirmMessage += `Academic Standing: ${yearLabel} (Semester ${profile.currentSemester})\n`;
                    confirmMessage += `Completed Courses: ${profile.completedCourses.length}\n`;
                    confirmMessage += `Total Units Completed: ${profile.completedCourses.reduce((sum, c) => sum + c.units, 0)}\n`;

                    if (inProgressCourses.length > 0) {
                        confirmMessage += `\nCurrently Enrolled: ${currentTermCourses}\n`;
                    }

                    confirmMessage += `\nI now have access to your complete course history and can help you with:\n`;
                    confirmMessage += `• Planning your next semester based on prerequisites\n`;
                    confirmMessage += `• Recommending courses you're eligible to take\n`;
                    confirmMessage += `• Creating a graduation timeline\n`;
                    confirmMessage += `• Checking prerequisites for specific courses\n\n`;
                    confirmMessage += inputValue.trim() ? '' : 'What would you like to know about your academic plan?';

                    // Add system message about successful upload
                    const systemMessage: Message = {
                        id: `system-${Date.now()}`,
                        role: 'assistant',
                        content: confirmMessage,
                        timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, systemMessage]);

                    // If there's also a text message, send it
                    if (inputValue.trim()) {
                        await handleSendMessage(inputValue);
                    }
                } else {
                    // Upload failed or no courses found
                    const errorMsg: Message = {
                        id: `error-${Date.now()}`,
                        role: 'assistant',
                        content: uploadData.error || "I couldn't process that file. Please make sure it's a valid PDF transcript from UAccess.",
                        timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, errorMsg]);
                }
            } catch (error) {
                console.error('File upload error:', error);
                const errorMsg: Message = {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: "There was an error uploading your file. Please try again.",
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMsg]);
            } finally {
                setUploadingFile(false);
                setSelectedFile(null);
                setInputValue('');
            }
        } else {
            // No file, just send the message
            await handleSendMessage(inputValue);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendWithFile();
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
                    <div className={styles.logo}>
                        <div className={styles.logoMark}>PM</div>
                        <span className={styles.logoText}>AI Advisor</span>
                    </div>
                </div>
                <div className={styles.headerRight}>
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
                    {/* Transcript Upload Banner - Show if no transcript */}
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

                    {/* Messages */}
                    <div className={styles.messagesArea}>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`${styles.message} ${message.role === 'assistant' ? styles.messageAi : styles.messageUser}`}
                            >
                                <div className={`${styles.avatar} ${message.role === 'assistant' ? styles.avatarAi : styles.avatarUser}`}>
                                    {message.role === 'assistant' ? 'AI' : studentName.charAt(0).toUpperCase()}
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
                                <div className={`${styles.avatar} ${styles.avatarAi}`}>AI</div>
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
                                        {prompt.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className={styles.inputArea}>
                        {/* Selected File Display */}
                        {selectedFile && (
                            <div className={styles.selectedFileBar}>
                                <div className={styles.selectedFileInfo}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14,2 14,8 20,8" />
                                    </svg>
                                    <span>{selectedFile.name}</span>
                                </div>
                                <button
                                    className={styles.removeFileBtn}
                                    onClick={() => setSelectedFile(null)}
                                    type="button"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <div className={styles.inputWrapper}>
                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{ display: 'none' }}
                            />
                            {/* File Attachment Button */}
                            <button
                                className={styles.attachButton}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                                type="button"
                                title="Attach transcript or document"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                            </button>
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
                                onClick={handleSendWithFile}
                                disabled={(!inputValue.trim() && !selectedFile) || isTyping || uploadingFile}
                            >
                                {uploadingFile ? (
                                    <div className={styles.uploadSpinner}></div>
                                ) : (
                                    <svg className={styles.sendIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <p className={styles.footerHint}>
                            Press Enter to send • Attach PDF transcripts for personalized advice
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
