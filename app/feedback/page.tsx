'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/support.module.css';

export default function FeedbackPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <img src="/gradlae-logo.png" alt="Gradlae" className="brandLogo" onClick={() => router.push(user ? '/dashboard' : '/')} style={{ cursor: 'pointer' }} />
                <button className={styles.backBtn} onClick={() => router.push('/')}>
                    Back to Home
                </button>
            </header>

            <main className={styles.main}>
                <div className={styles.contentCard}>
                    {submitted ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.14em', marginBottom: '20px', color: 'var(--uofa-red)' }}>SUBMITTED</div>
                            <h1>Thank You!</h1>
                            <p className={styles.subtitle}>Your feedback has been submitted successfully. We appreciate your input!</p>
                            <button className={styles.submitBtn} onClick={() => router.push('/')}>
                                Return Home
                            </button>
                        </div>
                    ) : (
                        <>
                            <h1>Feedback</h1>
                            <p className={styles.subtitle}>Help us improve Gradlae by sharing your thoughts and suggestions.</p>

                            <form onSubmit={handleSubmit} className={styles.feedbackForm}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="name">Full Name</label>
                                    <input type="text" id="name" className={styles.input} placeholder="Enter your name" required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="email">Email Address</label>
                                    <input type="email" id="email" className={styles.input} placeholder="Enter your email" required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="type">Feedback Type</label>
                                    <select id="type" className={styles.input}>
                                        <option>General Suggestion</option>
                                        <option>Bug Report</option>
                                        <option>Course Request</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="message">Your Message</label>
                                    <textarea id="message" className={styles.textarea} rows={6} placeholder="How can we improve?" required></textarea>
                                </div>
                                <button type="submit" className={styles.submitBtn}>Submit Feedback</button>
                            </form>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
