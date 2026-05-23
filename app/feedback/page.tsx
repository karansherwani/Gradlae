'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/support.module.css';

export default function FeedbackPage() {
    const router = useRouter();
    const { user } = useAuth();
    
    // Controlled form states
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [type, setType] = useState('General Suggestion');
    const [message, setMessage] = useState('');
    
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, type, message }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSubmitted(true);
            } else {
                setError(data.message || 'Failed to submit feedback. Please try again.');
            }
        } catch (err) {
            setError('Connection failed. Please check your network and try again.');
            console.error('Feedback Submit Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <img 
                    src="/gradlae-logo.png" 
                    alt="Gradlae" 
                    className="brandLogo" 
                    onClick={() => router.push(user ? '/dashboard' : '/')} 
                    style={{ cursor: 'pointer' }} 
                />
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
                            <h1>Feedback &amp; Bug Reports</h1>
                            <p className={styles.subtitle}>Help us improve Gradlae by sharing your thoughts, reporting bugs, or suggesting changes.</p>

                            <form onSubmit={handleSubmit} className={styles.feedbackForm}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="name">Full Name</label>
                                    <input 
                                        type="text" 
                                        id="name" 
                                        className={styles.input} 
                                        placeholder="Enter your name" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required 
                                        disabled={loading}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="email">Email Address</label>
                                    <input 
                                        type="email" 
                                        id="email" 
                                        className={styles.input} 
                                        placeholder="Enter your email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required 
                                        disabled={loading}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="type">Feedback Type</label>
                                    <select 
                                        id="type" 
                                        className={styles.input}
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option>General Suggestion</option>
                                        <option>Bug Report</option>
                                        <option>Course Request</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="message">Your Message</label>
                                    <textarea 
                                        id="message" 
                                        className={styles.textarea} 
                                        rows={6} 
                                        placeholder="How can we improve? If reporting a bug, please describe the steps to reproduce it." 
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                        disabled={loading}
                                    ></textarea>
                                </div>
                                
                                {error && <p className={styles.error} style={{ color: 'red', fontSize: '0.9rem', margin: '10px 0' }}>{error}</p>}
                                
                                <button type="submit" className={styles.submitBtn} disabled={loading}>
                                    {loading ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
