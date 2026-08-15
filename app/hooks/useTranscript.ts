'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import type { TranscriptCourseRow } from '@/app/lib/transcriptUtils';

interface TranscriptState {
    courses: TranscriptCourseRow[];
    hasTranscript: boolean;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

async function readJsonResponse(response: Response) {
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed) {
        if (response.ok) return {};
        throw new Error(`Request failed with status ${response.status}`);
    }
    return JSON.parse(trimmed);
}

export function useTranscript(): TranscriptState {
    const { user, accessToken, loading: authLoading } = useAuth();
    const [courses, setCourses] = useState<TranscriptCourseRow[]>([]);
    const [hasTranscript, setHasTranscript] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!user || !accessToken) {
            setCourses([]);
            setHasTranscript(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/upload', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await readJsonResponse(response) as {
                courses?: TranscriptCourseRow[];
                hasTranscript?: boolean;
            };

            const savedCourses = data.courses ?? [];
            setCourses(savedCourses);
            setHasTranscript(Boolean(data.hasTranscript && savedCourses.length > 0));
        } catch (err) {
            console.error('Transcript load error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load transcript');
            setCourses([]);
            setHasTranscript(false);
        } finally {
            setLoading(false);
        }
    }, [user, accessToken]);

    useEffect(() => {
        if (authLoading) return;
        void refresh();
    }, [authLoading, refresh]);

    return {
        courses,
        hasTranscript,
        loading: authLoading || loading,
        error,
        refresh,
    };
}
