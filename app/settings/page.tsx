'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/settings.module.css';

interface DataSummary {
    user: {
        id: string;
        email: string;
        name: string;
        school: string;
    };
    data: {
        transcriptUploaded: boolean;
        transcriptDate: string | null;
        plannerSaved: boolean;
        plannerLastUpdated: string | null;
        advisorSessions: number;
    };
}

export default function SettingsPage() {
    const router = useRouter();
    const { accessToken, user, loading: authLoading } = useAuth();
    const [summary, setSummary] = useState<DataSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const fetchSummary = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await fetch('/api/user/data', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSummary(data);
            }
        } catch (error) {
            console.error('Failed to fetch data summary:', error);
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth');
            return;
        }
        if (accessToken) fetchSummary();
    }, [accessToken, authLoading, user, router, fetchSummary]);

    const handleDelete = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }

        setDeleting(true);
        try {
            const res = await fetch('/api/user/data', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                setSummary(prev => prev ? {
                    ...prev,
                    data: {
                        transcriptUploaded: false,
                        transcriptDate: null,
                        plannerSaved: false,
                        plannerLastUpdated: null,
                        advisorSessions: 0,
                    }
                } : null);
                setConfirmDelete(false);
            }
        } catch (error) {
            console.error('Failed to delete data:', error);
        } finally {
            setDeleting(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading settings…</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logo} onClick={() => router.push('/dashboard')}>
                    PACEMAKER
                </div>
                <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
                    Back to Dashboard
                </button>
            </header>

            <main className={styles.main}>
                <h1 className={styles.title}>Account &amp; Data</h1>
                <p className={styles.subtitle}>See what data is stored for your account and manage it.</p>

                {/* Profile card */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Profile</div>
                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Email</span>
                        <span className={styles.dataValue}>{summary?.user.email || user?.email || '—'}</span>
                    </div>
                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Name</span>
                        <span className={styles.dataValue}>{summary?.user.name || '—'}</span>
                    </div>
                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>School</span>
                        <span className={styles.dataValue}>{summary?.user.school || '—'}</span>
                    </div>
                </div>

                {/* Data summary card */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Stored Data</div>

                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Transcript uploaded</span>
                        <span className={`${styles.badge} ${summary?.data.transcriptUploaded ? styles.badgeGreen : styles.badgeGray}`}>
                            {summary?.data.transcriptUploaded ? 'Yes' : 'No'}
                        </span>
                    </div>
                    {summary?.data.transcriptDate && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Transcript date</span>
                            <span className={styles.dataValue}>
                                {new Date(summary.data.transcriptDate).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Planner saved</span>
                        <span className={`${styles.badge} ${summary?.data.plannerSaved ? styles.badgeGreen : styles.badgeGray}`}>
                            {summary?.data.plannerSaved ? 'Yes' : 'No'}
                        </span>
                    </div>
                    {summary?.data.plannerLastUpdated && (
                        <div className={styles.dataRow}>
                            <span className={styles.dataLabel}>Last updated</span>
                            <span className={styles.dataValue}>
                                {new Date(summary.data.plannerLastUpdated).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Advisor sessions logged</span>
                        <span className={styles.dataValue}>{summary?.data.advisorSessions ?? 0}</span>
                    </div>
                </div>

                {/* Danger zone */}
                <div className={`${styles.card} ${styles.dangerZone}`}>
                    <div className={styles.cardTitle}>Danger Zone</div>
                    <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 16 }}>
                        This will permanently delete all your transcripts, planner data, and advisor session logs.
                        Your account will remain, but all associated data will be removed.
                    </p>
                    <button
                        className={styles.deleteBtn}
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting…' : confirmDelete ? 'Click again to confirm deletion' : 'Delete All My Data'}
                    </button>
                    {confirmDelete && !deleting && (
                        <p className={styles.confirmText}>
                            Are you sure? This action cannot be undone.
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}
