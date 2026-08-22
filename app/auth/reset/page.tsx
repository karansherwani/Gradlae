'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { getPasswordValidationError } from '@/app/lib/validation';
import { UNIVERSITIES, getUniversityById } from '@/app/lib/universities';
import styles from '@/app/styles/auth.module.css';

type Phase = 'checking' | 'request' | 'sent' | 'ready' | 'invalid';

function hasRecoveryParams(): boolean {
    if (typeof window === 'undefined') return false;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    return (
        hashParams.get('type') === 'recovery'
        || queryParams.get('type') === 'recovery'
        || Boolean(queryParams.get('code'))
        || Boolean(hashParams.get('access_token'))
    );
}

function ResetPasswordContent() {
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>(() => (hasRecoveryParams() ? 'checking' : 'request'));
    const [selectedUniversity, setSelectedUniversity] = useState('');
    const [netId, setNetId] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const recoveryResolvedRef = useRef(false);

    useEffect(() => {
        const stored = localStorage.getItem('selectedUniversity');
        if (stored) setSelectedUniversity(stored);
    }, []);

    useEffect(() => {
        if (!hasRecoveryParams()) return;

        let cancelled = false;

        const markReady = () => {
            if (cancelled) return;
            recoveryResolvedRef.current = true;
            setPhase('ready');
            setError('');
            window.history.replaceState({}, '', '/auth/reset');
        };

        const markInvalid = (msg: string) => {
            if (cancelled) return;
            recoveryResolvedRef.current = true;
            setPhase('invalid');
            setError(msg);
        };

        const establishRecoverySession = async () => {
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const queryParams = new URLSearchParams(window.location.search);
            const code = queryParams.get('code');
            const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

            if (errorDescription) {
                markInvalid(errorDescription.replace(/\+/g, ' '));
                return;
            }

            if (code) {
                const { data: existing } = await supabase.auth.getSession();
                if (!existing.session) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        markInvalid('This reset link is invalid or has expired. Request a new one.');
                        return;
                    }
                    markReady();
                    return;
                }
            }

            // Implicit flow: Supabase parses #access_token&type=recovery from the hash.
            await new Promise((resolve) => setTimeout(resolve, 150));
            const { data: { session } } = await supabase.auth.getSession();
            const type = hashParams.get('type') || queryParams.get('type');

            if (session && type === 'recovery') {
                markReady();
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
                markReady();
            }
        });

        void establishRecoverySession();

        const timeout = window.setTimeout(() => {
            if (!cancelled && !recoveryResolvedRef.current) {
                markInvalid('This reset link is invalid or has expired. Request a new one.');
            }
        }, 8000);

        return () => {
            cancelled = true;
            subscription.unsubscribe();
            window.clearTimeout(timeout);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for recovery URL params
    }, []);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!selectedUniversity) {
            setError('Select your university');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    netId: netId || undefined,
                    university: selectedUniversity,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setPhase('sent');
                setMessage(data.message || 'If that account exists, a password reset email has been sent.');
            } else {
                setError(data.message || 'Unable to process your request. Please try again.');
            }
        } catch {
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const passwordError = getPasswordValidationError(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) {
                setError('Unable to update password. Request a new reset link.');
                console.error('Password update error:', updateError.message);
                return;
            }

            await supabase.auth.signOut();
            setMessage('Password updated. You can sign in with your new password.');
            setTimeout(() => {
                router.push('/auth');
            }, 1600);
        } catch {
            setError('Unable to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const universityDomain = getUniversityById(selectedUniversity)?.domain || 'your-university.edu';

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button type="button" className={styles.backBtn} onClick={() => router.push('/auth')}>
                    Back
                </button>
                <div>
                    <img
                        src="/gradlae-logo.png"
                        alt="Gradlae"
                        className={styles.authLogo}
                        onClick={() => router.push('/')}
                    />
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.authCard}>
                    {phase === 'checking' && (
                        <>
                            <h1>Set a new password</h1>
                            <p className={styles.fieldHint}>Validating your reset link...</p>
                        </>
                    )}

                    {(phase === 'request' || phase === 'sent' || phase === 'invalid') && (
                        <>
                            <h1>Reset your password</h1>
                            <p>
                                Enter your NetID and university. We&apos;ll email you a secure link to set a new password.
                            </p>

                            {phase === 'sent' ? (
                                <>
                                    {message && (
                                        <p className={styles.success} style={{ color: 'green', fontSize: '0.9rem', marginBottom: '15px' }}>
                                            {message}
                                        </p>
                                    )}
                                    <p className={styles.fieldHint}>
                                        Check your university email inbox (and spam folder) for the reset link.
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.submitBtn}
                                        onClick={() => router.push('/auth')}
                                    >
                                        Back to Sign In
                                    </button>
                                </>
                            ) : (
                                <form onSubmit={handleRequestReset}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="university">University</label>
                                        <select
                                            id="university"
                                            value={selectedUniversity}
                                            onChange={(e) => {
                                                setSelectedUniversity(e.target.value);
                                                localStorage.setItem('selectedUniversity', e.target.value);
                                            }}
                                            required
                                            disabled={loading}
                                        >
                                            <option value="">Select your university</option>
                                            {UNIVERSITIES.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="netId">NetID</label>
                                        <input
                                            id="netId"
                                            type="text"
                                            value={netId}
                                            onChange={(e) => setNetId(e.target.value)}
                                            placeholder="e.g., jsmith"
                                            required
                                            disabled={loading}
                                            autoComplete="username"
                                        />
                                        <p className={styles.fieldHint}>
                                            Reset link will be sent to {netId || 'your-netid'}@{universityDomain}
                                        </p>
                                    </div>

                                    {error && <p className={styles.error}>{error}</p>}

                                    <button type="submit" className={styles.submitBtn} disabled={loading || !netId || !selectedUniversity}>
                                        {loading ? 'Sending...' : 'Send reset email'}
                                    </button>

                                    <button
                                        type="button"
                                        className={styles.toggleBtn}
                                        style={{ marginTop: '15px', width: '100%' }}
                                        onClick={() => router.push('/auth')}
                                    >
                                        Back to Sign In
                                    </button>
                                </form>
                            )}
                        </>
                    )}

                    {phase === 'ready' && (
                        <>
                            <h1>Set a new password</h1>
                            <p>Choose a new password for your Gradlae account.</p>

                            <form onSubmit={handleSetPassword}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="newPassword">New password</label>
                                    <div className={styles.passwordWrapper}>
                                        <input
                                            id="newPassword"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="At least 8 characters"
                                            required
                                            disabled={loading}
                                            autoComplete="new-password"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            className={styles.togglePassword}
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <p className={styles.fieldHint}>
                                        Must include uppercase, lowercase, and a number
                                    </p>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="confirmPassword">Confirm password</label>
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter your new password"
                                        required
                                        disabled={loading}
                                        autoComplete="new-password"
                                    />
                                </div>

                                {error && <p className={styles.error}>{error}</p>}
                                {message && (
                                    <p className={styles.success} style={{ color: 'green', fontSize: '0.9rem', marginBottom: '15px' }}>
                                        {message}
                                    </p>
                                )}

                                <button type="submit" className={styles.submitBtn} disabled={loading || !password || !confirmPassword}>
                                    {loading ? 'Updating...' : 'Update password'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className={styles.container} />}>
            <ResetPasswordContent />
        </Suspense>
    );
}
