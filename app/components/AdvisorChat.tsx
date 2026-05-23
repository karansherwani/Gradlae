'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from '../styles/advisor.module.css';

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

interface AdvisorChatProps {
    studentName: string;
    welcomeMessage?: string;
    studentContext?: string; // Pre-built context from advisor page
    accessToken?: string;
    initialMessages?: Message[];
    conversationKey?: string;
    onTranscriptParsed?: (ctx: string) => void; // Callback when a transcript is uploaded in-chat
    onMessagesChange?: (messages: Message[]) => void;
}

// ─── Credit helpers (W removed, duplicates de-duped) ─────────────────────
function computeCorrectedCredits(courses: TranscriptCourse[]) {
    const passing = courses.filter(c => c.course && c.grade !== 'W' && c.grade !== 'IP');
    const seen = new Map<string, TranscriptCourse>();
    for (const c of passing) {
        const key = (c.course ?? '').trim().toUpperCase();
        if (key && !seen.has(key)) {
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

export default function AdvisorChat({
    studentName,
    welcomeMessage,
    studentContext,
    accessToken,
    initialMessages,
    conversationKey,
    onTranscriptParsed,
    onMessagesChange,
}: AdvisorChatProps) {
    const [messages, setMessages] = useState<Message[]>(() => {
        if (initialMessages?.length) return initialMessages;
        if (welcomeMessage) {
            return [{
                id: 'welcome',
                role: 'assistant' as const,
                content: welcomeMessage,
                timestamp: new Date(),
            }];
        }
        return [];
    });
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeContext, setActiveContext] = useState(studentContext || '');
    const [documentContexts, setDocumentContexts] = useState<string[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isHomeMode = messages.length === 1 && messages[0]?.id === 'welcome' && !isTyping;

    useEffect(() => {
        if (initialMessages?.length) {
            setMessages(initialMessages.map(message => ({
                ...message,
                timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp),
            })));
        } else if (welcomeMessage) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: welcomeMessage,
                timestamp: new Date(),
            }]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationKey]);

    useEffect(() => {
        onMessagesChange?.(messages);
    }, [messages, onMessagesChange]);

    // Keep activeContext in sync with prop changes
    useEffect(() => {
        if (studentContext) setActiveContext(studentContext);
    }, [studentContext]);

    useEffect(() => {
        const handlePrompt = (event: Event) => {
            const prompt = (event as CustomEvent<string>).detail;
            if (typeof prompt === 'string') {
                setInputValue(prompt);
                requestAnimationFrame(() => {
                    const textarea = document.querySelector(`.${styles.textInput}`) as HTMLTextAreaElement | null;
                    textarea?.focus();
                });
            }
        };

        window.addEventListener('advisor-prompt', handlePrompt);
        return () => window.removeEventListener('advisor-prompt', handlePrompt);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // ─── File upload handler ─────────────────────────────────────────────
    const handleFileUpload = useCallback(async (file: File) => {
        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please upload a PDF file.');
            return;
        }

        setUploadingFile(true);
        setError(null);
        setUploadedFileName(file.name);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Use the general-purpose advisor upload endpoint
            const res = await fetch('/api/advisor/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Upload failed');

            if (data.type === 'transcript' && data.courses?.length > 0) {
                // ─── Transcript detected ─────────────────────────────────
                const ctx = buildTranscriptContext(data.courses, studentName);
                setActiveContext(ctx);
                onTranscriptParsed?.(ctx);

                const { earnedCredits, uniqueCompleted, inProgress } = computeCorrectedCredits(data.courses);
                const feedbackMsg: Message = {
                    id: `system-${Date.now()}`,
                    role: 'assistant',
                    content:
                        `I've analyzed your transcript (${file.name}).\n\n` +
                        `Unique completed courses: ${uniqueCompleted.length}\n` +
                        `Earned credits (no W, no duplicates): ${earnedCredits}\n` +
                        (inProgress.length > 0
                            ? `In-progress courses: ${inProgress.length} (${inProgress.reduce((s, c) => s + c.credits, 0)} cr)\n`
                            : '') +
                        `\nI now have your full academic history. Ask me anything about your degree progress, remaining requirements, or graduation planning!`,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, feedbackMsg]);
            } else if (data.type === 'document' && data.text) {
                // ─── Generic document (planner, syllabus, etc.) ──────────
                const docLabel = `UPLOADED DOCUMENT: ${data.fileName}\n${data.text}`;
                setDocumentContexts(prev => [...prev, docLabel]);

                const feedbackMsg: Message = {
                    id: `system-${Date.now()}`,
                    role: 'assistant',
                    content:
                        `I've read your document "${data.fileName}" (${data.textLength.toLocaleString()} characters).` +
                        (data.truncated ? ' (It was long so I processed the most relevant portion.)' : '') +
                        `\n\nI can now reference this document when answering your questions. Go ahead and ask me about it!`,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, feedbackMsg]);
            } else {
                setError('Could not extract useful content from this file. Please try a different PDF.');
                setUploadedFileName(null);
            }
        } catch (err) {
            console.error('File upload error:', err);
            setError(err instanceof Error ? err.message : 'File upload failed');
            setUploadedFileName(null);
        } finally {
            setUploadingFile(false);
        }
    }, [studentName, onTranscriptParsed]);

    // ─── Build the full context to send to the advisor ────────────────────
    const buildFullContext = useCallback(() => {
        const parts: string[] = [];
        if (activeContext) parts.push(activeContext);
        if (documentContexts.length > 0) {
            parts.push('\n--- ADDITIONAL UPLOADED DOCUMENTS ---');
            for (const doc of documentContexts) {
                parts.push(doc);
            }
        }
        return parts.join('\n\n');
    }, [activeContext, documentContexts]);

    // ─── Send message ────────────────────────────────────────────────────
    const sendMessage = async (content: string) => {
        if (!content.trim()) return;
        setError(null);

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
            // Build messages for the API (exclude welcome & system feedback messages)
            const chatMessages = [...messages, userMessage]
                .filter(m => m.role === 'user' || (m.role === 'assistant' && !m.id.startsWith('system-') && m.id !== 'welcome'))
                .map(m => ({ role: m.role, content: m.content }));

            const fullCtx = buildFullContext();

            const response = await fetch('/api/advisor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({
                    messages: chatMessages,
                    studentContext: fullCtx || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            const aiResponse: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.message,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, aiResponse]);
        } catch (err) {
            console.error('Advisor chat error:', err);
            const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
            setError(errorMsg);

            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: `I'm sorry, I encountered an error: ${errorMsg}. Please try again.`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`${styles.advisorChat} ${isHomeMode ? styles.advisorChatHome : styles.advisorChatActive}`}>
            {error && (
                <div className={styles.errorNotice}>
                    Notice: {error}
                </div>
            )}

            {!isHomeMode && (
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
            )}

            {/* Uploaded file indicator */}
            {uploadedFileName && (
                <div className={styles.selectedFileBar}>
                    <div className={styles.selectedFileInfo}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                        </svg>
                        {uploadedFileName}
                    </div>
                    <button
                        className={styles.removeFileBtn}
                        onClick={() => setUploadedFileName(null)}
                        title="Remove file"
                    >
                        Remove
                    </button>
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = '';
                }}
            />

            {/* Input Area */}
            <div className={styles.inputArea}>
                <div className={styles.inputWrapper}>
                    {/* File upload button */}
                    <button
                        className={styles.attachButton}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile || isTyping}
                        title="Upload a PDF (transcript, planner, syllabus, etc.)"
                    >
                        {uploadingFile ? (
                            <div className={styles.uploadSpinner}></div>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                            </svg>
                        )}
                    </button>

                    <textarea
                        className={styles.textInput}
                        placeholder="Ask about course planning, prerequisites, or graduation..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        rows={1}
                    />
                    <button
                        className={styles.sendButton}
                        onClick={() => sendMessage(inputValue)}
                        disabled={!inputValue.trim() || isTyping}
                    >
                        <svg className={styles.sendIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                    </button>
                </div>
                <p className={styles.footerHint}>
                    Press Enter to send. Upload any PDF transcript, planner, or syllabus. Powered by Gemini.
                </p>
            </div>
        </div>
    );
}
