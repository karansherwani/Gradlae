'use client';

import { useState, useRef, useEffect } from 'react';
import styles from '../styles/advisor.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface AdvisorChatProps {
    studentName: string;
    welcomeMessage?: string;
    studentContext?: string; // Text context about the student (transcript etc.)
}

export default function AdvisorChat({
    studentName,
    welcomeMessage,
    studentContext,
}: AdvisorChatProps) {
    const [messages, setMessages] = useState<Message[]>(() => {
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

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
            // Read API key from localStorage
            const apiKey = localStorage.getItem('openai_api_key') || '';

            // Build messages for the API (exclude welcome)
            const chatMessages = [...messages, userMessage]
                .filter(m => m.id !== 'welcome' || m.role === 'assistant')
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/advisor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: chatMessages,
                    apiKey: apiKey || undefined,
                    studentContext: studentContext || undefined,
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

            if (errorMsg.includes('API key')) {
                setError('Please set your OpenAI API key in the settings above.');
            } else {
                setError(errorMsg);
            }

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
        <>
            {error && (
                <div style={{
                    padding: '10px 16px',
                    background: 'rgba(220, 38, 38, 0.08)',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '0.85rem',
                    marginBottom: '12px',
                }}>
                    ⚠️ {error}
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

            {/* Input Area */}
            <div className={styles.inputArea}>
                <div className={styles.inputWrapper}>
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
                    Press Enter to send • Powered by GPT-4o-mini
                </p>
            </div>
        </>
    );
}
