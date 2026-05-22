'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/journal.module.css';

interface JournalEntry {
    id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export default function JournalPage() {
    const router = useRouter();
    const { user, dbUser, accessToken, loading: authLoading } = useAuth();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(true);

    const displayName = dbUser?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

    // Load entries from Supabase
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/auth');
            return;
        }
        loadEntries();
    }, [authLoading, user, accessToken]);

    const loadEntries = async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/user/journal', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                const fetchedEntries: JournalEntry[] = data.entries || [];
                setEntries(fetchedEntries);

                if (fetchedEntries.length > 0) {
                    const latest = fetchedEntries[0]; // Already sorted by updated_at desc
                    setActiveEntryId(latest.id);
                    setTitle(latest.title);
                    setContent(latest.content);
                }
            }
        } catch (error) {
            console.error('Error loading journal entries:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-save on content/title change (debounced)
    useEffect(() => {
        if (!activeEntryId || loading || !accessToken) return;
        setSaved(false);

        const timeout = setTimeout(async () => {
            try {
                await fetch('/api/user/journal', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        entryId: activeEntryId,
                        title: title || 'Untitled',
                        content,
                    }),
                });
                // Update local state
                setEntries(prev =>
                    prev.map(e =>
                        e.id === activeEntryId
                            ? { ...e, title: title || 'Untitled', content, updated_at: new Date().toISOString() }
                            : e
                    )
                );
                setSaved(true);
            } catch (error) {
                console.error('Error saving journal entry:', error);
            }
        }, 800);

        return () => clearTimeout(timeout);
    }, [title, content, activeEntryId, loading, accessToken]);

    const createNewEntry = async () => {
        if (!accessToken) return;

        try {
            const response = await fetch('/api/user/journal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ title: '', content: '' }),
            });

            if (response.ok) {
                const data = await response.json();
                const newEntry = data.entry;
                setEntries(prev => [newEntry, ...prev]);
                setActiveEntryId(newEntry.id);
                setTitle('');
                setContent('');
            }
        } catch (error) {
            console.error('Error creating journal entry:', error);
        }
    };

    const selectEntry = (entry: JournalEntry) => {
        setActiveEntryId(entry.id);
        setTitle(entry.title);
        setContent(entry.content);
    };

    const deleteEntry = async (entryId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!accessToken) return;

        try {
            await fetch(`/api/user/journal?entryId=${entryId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            const updated = entries.filter(en => en.id !== entryId);
            setEntries(updated);

            if (activeEntryId === entryId) {
                if (updated.length > 0) {
                    setActiveEntryId(updated[0].id);
                    setTitle(updated[0].title);
                    setContent(updated[0].content);
                } else {
                    setActiveEntryId(null);
                    setTitle('');
                    setContent('');
                }
            }
        } catch (error) {
            console.error('Error deleting journal entry:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (authLoading || loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.logo}>
                        <div className={styles.logoMark}>PM</div>
                        <span className={styles.logoText}>Journal</span>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.saveStatus}>
                        {activeEntryId && (
                            <span className={saved ? styles.savedIndicator : styles.savingIndicator}>
                                {saved ? 'Saved' : 'Saving...'}
                            </span>
                        )}
                    </div>
                    <button className={styles.backButton} onClick={() => router.push('/dashboard')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Dashboard
                    </button>
                </div>
            </header>

            <main className={styles.main}>
                {/* Sidebar — Entry List */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>My Entries</h2>
                        <button className={styles.newEntryBtn} onClick={createNewEntry} title="New entry">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>

                    <div className={styles.entryList}>
                        {entries.length === 0 ? (
                            <div className={styles.emptyState}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                </svg>
                                <p>No journal entries yet</p>
                                <button className={styles.emptyStateBtn} onClick={createNewEntry}>
                                    Create your first entry
                                </button>
                            </div>
                        ) : (
                            entries.map(entry => (
                                <div
                                    key={entry.id}
                                    className={`${styles.entryItem} ${activeEntryId === entry.id ? styles.entryItemActive : ''}`}
                                    onClick={() => selectEntry(entry)}
                                >
                                    <div className={styles.entryItemContent}>
                                        <h4>{entry.title || 'Untitled'}</h4>
                                        <p className={styles.entryPreview}>
                                            {entry.content.slice(0, 80) || 'Empty entry...'}
                                            {entry.content.length > 80 ? '...' : ''}
                                        </p>
                                        <span className={styles.entryDate}>
                                            {formatDate(entry.updated_at)} · {formatTime(entry.updated_at)}
                                        </span>
                                    </div>
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={(e) => deleteEntry(entry.id, e)}
                                        title="Delete entry"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* Editor Area */}
                <div className={styles.editor}>
                    {activeEntryId ? (
                        <>
                            <input
                                className={styles.titleInput}
                                type="text"
                                placeholder="Entry title..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <div className={styles.editorMeta}>
                                {entries.find(e => e.id === activeEntryId) && (
                                    <span>
                                        Created {formatDate(entries.find(e => e.id === activeEntryId)!.created_at)}
                                        {' · '}
                                        Last edited {formatDate(entries.find(e => e.id === activeEntryId)!.updated_at)}
                                    </span>
                                )}
                            </div>
                            <textarea
                                className={styles.contentInput}
                                placeholder="Start writing... Reflect on your academic journey, set goals, or jot down anything on your mind."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </>
                    ) : (
                        <div className={styles.editorEmpty}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                            <h3>Your Journal</h3>
                            <p>Select an entry from the sidebar or create a new one to get started.</p>
                            <button className={styles.editorEmptyBtn} onClick={createNewEntry}>
                                New Entry
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
