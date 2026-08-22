'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import styles from '@/app/styles/auth.module.css';

function ResetPasswordContent() {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const establishRecoverySession = async () => {
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const queryParams = new URLSearchParams(window.location.search);
            const code = queryParams.get('code');
            const type = hashParams.get('type') || queryParams.get('type');
            const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

            if (errorDescription) {
                if (!cancelled) {
                    setStatus('invalid');
                    setError(errorDescription.replace(/\+/g, ' '));
                }
                return;
            }

            if (code) {
                const { data: existing } = await supabase.auth.getSession();
                if (!existing.session) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        if (!cancelled) {
                            setStatus('invalid');
                            setError('This reset link is invalid or has expired. Request a new one.');
                        }
                        return;
                    }
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            const isRecovery = type === 'recovery' || Boolean(session);

            if (!cancelled) {
                if (isRecovery && session) {
                    setStatus('ready');
                    window.history.replaceState({}, '', '/auth/reset');
                } else {
                    setStatus('invalid');
                    setError('This reset link is invalid or has expired. Request a new one.');
                }
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session && !cancelled) {
                setStatus('ready');
                setError('');
            }
        });

        void establishRecoverySession();

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            setError('Password must be at least 8 characters and include uppercase, lowercase, and a number');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) {
                setError(updateError.message || 'Unable to update password. Request a new reset link.');
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

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.push('/auth')}>
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
                    <h1>Set a new password</h1>
                    <p>Choose a new password for your Gradlae account.</p>

                    {status === 'loading' && (
                        <p className={styles.fieldHint}>Validating your reset link...</p>
                    )}

                    {status === 'invalid' && (
                        <>
                            {error && <p className={styles.error}>{error}</p>}
                            <button
                                type="button"
                                className={styles.submitBtn}
                                onClick={() => router.push('/auth')}
                            >
                                Request a new reset email
                            </button>
                        </>
                    )}

                    {status === 'ready' && (
                        <form onSubmit={handleSubmit}>
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
