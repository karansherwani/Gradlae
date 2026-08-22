'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import { FEEDBACK_TYPES } from '../lib/validation';
import styles from '../styles/support.module.css';

export default function FeedbackPage() {
    const router = useRouter();
    const { user, dbUser, accessToken, loading: authLoading } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [type, setType] = useState<(typeof FEEDBACK_TYPES)[number]>('General Suggestion');
    const [message, setMessage] = useState('');
    const [includeAccount, setIncludeAccount] = useState(false);
    const [prefilled, setPrefilled] = useState(false);

    const [submitted, setSubmitted] = useState(false);
    const [feedbackId, setFeedbackId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Prefill from the Gradlae profile / auth session when available (once).
    useEffect(() => {
        if (authLoading || prefilled) return;

        const prefillName = dbUser?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
        const prefillEmail = dbUser?.email || user?.email || '';

        if (prefillName || prefillEmail) {
            setName((current) => current || prefillName);
            setEmail((current) => current || prefillEmail);
            setIncludeAccount(true);
        }
        setPrefilled(true);
    }, [authLoading, dbUser, user, prefilled]);

    const isLoggedIn = Boolean(accessToken && (dbUser || user));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (includeAccount && accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
            }

            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name,
                    email,
                    type,
                    message,
                    includeAccount: Boolean(includeAccount && accessToken),
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setFeedbackId(data.feedbackId || null);
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
                            {feedbackId && (
                                <p className={styles.subtitle} style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                    Reference ID: {feedbackId}
                                </p>
                            )}
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
                                        onChange={(e) => setType(e.target.value as (typeof FEEDBACK_TYPES)[number])}
                                        disabled={loading}
                                    >
                                        {FEEDBACK_TYPES.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
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

                                {isLoggedIn && (
                                    <div className={styles.formGroup}>
                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontWeight: 500, cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={includeAccount}
                                                onChange={(e) => setIncludeAccount(e.target.checked)}
                                                disabled={loading}
                                                style={{ marginTop: '3px' }}
                                            />
                                            <span>
                                                Link this feedback to my Gradlae account
                                                <span style={{ display: 'block', fontSize: '0.82rem', opacity: 0.75, marginTop: '4px' }}>
                                                    Optional. Uncheck to submit without attaching your account ID (you can also clear name/email above).
                                                </span>
                                            </span>
                                        </label>
                                    </div>
                                )}

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
