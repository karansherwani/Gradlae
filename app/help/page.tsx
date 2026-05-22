'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/support.module.css';

interface Message {
    text: string;
    sender: 'bot' | 'user';
}

export default function HelpCenterPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([
        { text: "Hello! I'm the PaceMatch support assistant. How can I help you today?", sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [step, setStep] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const isBusinessHours = () => {
        const now = new Date();
        const hours = now.getHours();
        // Business hours: 9:00 AM - 5:00 PM (17:00)
        return hours >= 9 && hours < 17;
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isTyping) return;

        const newMessages = [...messages, { text: inputValue, sender: 'user' as const }];
        setMessages(newMessages);
        setInputValue('');
        setIsTyping(true);

        // Simulated AI Bot Thinking
        setTimeout(() => {
            setIsTyping(false);
            if (step === 0) {
                setMessages(prev => [...prev, { text: "I'd be happy to help with that. To get started, could you please provide your full name and university?", sender: 'bot' }]);
                setStep(1);
            } else if (step === 1) {
                setMessages(prev => [...prev, { text: "Got it, thank you. Could you briefly describe the issue or question you have?", sender: 'bot' }]);
                setStep(2);
            } else if (step === 2) {
                const businessHours = isBusinessHours();
                const ticketId = Math.floor(Math.random() * 90000 + 10000);
                const finalMessage = businessHours
                    ? `I've opened a priority ticket (#${ticketId}) for you. Since you're contacting us during our active business hours, a support agent will reach out to you shortly via email.`
                    : `I've opened a ticket (#${ticketId}) for you. It's currently outside our standard business hours (9 AM - 5 PM), so our team will reach out to you as soon as we're back online tomorrow morning.`;
                setMessages(prev => [...prev, { text: finalMessage, sender: 'bot' }]);
                setStep(3);
            }
        }, 1500);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logoMark} style={{ background: 'white', color: 'var(--uofa-blue)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', marginRight: '10px' }}>PM</div>
                <div className={styles.logo} style={{ fontWeight: 'bold', fontSize: '1.2rem', flex: 1 }}>PaceMatch Help Center</div>
                <button className={styles.backBtn} onClick={() => router.push('/')}>
                    Return Home
                </button>
            </header>

            <main className={styles.main}>
                <div className={styles.contentCard} style={{ border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', textAlign: 'center' }}>How can we help?</h1>
                    <p className={styles.subtitle} style={{ textAlign: 'center', marginBottom: '40px' }}>Select a support method or chat with our automated assistant.</p>

                    <div className={styles.helpOptions}>
                        <div className={styles.helpCard}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '15px', color: 'var(--uofa-blue)' }}>PHONE</div>
                            <h3 style={{ color: 'var(--uofa-blue)' }}>24/7 Phone</h3>
                            <p>Immediate support for urgent issues.</p>
                            <a href="tel:+18005550199" className={styles.actionBtn} style={{ background: 'var(--uofa-blue)', color: 'white', padding: '8px 16px', borderRadius: '20px', display: 'inline-block' }}>Call Now</a>
                        </div>
                        <div className={styles.helpCard}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '15px', color: 'var(--uofa-blue)' }}>EMAIL</div>
                            <h3 style={{ color: 'var(--uofa-blue)' }}>Email Us</h3>
                            <p>For general inquiries and feedback.</p>
                            <a href="mailto:support@pacematch.com" className={styles.actionBtn} style={{ background: 'var(--uofa-blue)', color: 'white', padding: '8px 16px', borderRadius: '20px', display: 'inline-block' }}>Send Email</a>
                        </div>
                    </div>

                    <div id="chat-bot" className={styles.chatContainer} style={{ border: '1px solid #eee', borderRadius: '15px', overflow: 'hidden' }}>
                        <div className={styles.chatHeader} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '10px', height: '10px', background: '#4ade80', borderRadius: '50%' }}></div>
                            AI Support Agent (Online)
                        </div>
                        <div className={styles.chatMessages} style={{ background: '#fff' }}>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`${styles.message} ${styles[msg.sender]}`} style={{
                                    borderRadius: msg.sender === 'bot' ? '15px 15px 15px 0' : '15px 15px 0 15px',
                                    marginBottom: '10px',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                }}>
                                    {msg.text}
                                </div>
                            ))}
                            {isTyping && (
                                <div className={`${styles.message} ${styles.bot}`} style={{ fontStyle: 'italic', color: '#999' }}>
                                    Agent is typing...
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className={styles.chatInput} style={{ background: '#f8fafc' }}>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={step === 3 ? "Ticket created successfully" : "Type your message here..."}
                                disabled={step === 3 || isTyping}
                                style={{ borderRadius: '25px', padding: '12px 20px', border: '1px solid #e2e8f0' }}
                            />
                            <button
                                type="submit"
                                className={styles.sendBtn}
                                disabled={step === 3 || isTyping}
                                style={{ borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
