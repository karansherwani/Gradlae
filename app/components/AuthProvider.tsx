// components/AuthProvider.tsx
// Client-side auth context that wraps the app.
// Provides Supabase session info and helpers for all pages.
// This is the SINGLE SOURCE OF TRUTH for auth state.

'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

interface DbUser {
    id: string;       // users table PK (UUID)
    authId: string;   // Supabase auth UID
    email: string;
    name: string;
    school: string;
    role: string;
}

interface AuthContextValue {
    session: Session | null;
    user: User | null;
    dbUser: DbUser | null;
    loading: boolean;
    accessToken: string | null;
    signOut: () => Promise<void>;
    refreshDbUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    session: null,
    user: null,
    dbUser: null,
    loading: true,
    accessToken: null,
    signOut: async () => { },
    refreshDbUser: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [dbUser, setDbUser] = useState<DbUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch the DB user row for a given auth user
    const fetchDbUser = useCallback(async (accessToken: string) => {
        try {
            const response = await fetch('/api/user/me', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                setDbUser(data.user);
            }
        } catch (error) {
            console.error('Error fetching DB user:', error);
        }
    }, []);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session: s } }) => {
            setSession(s);
            if (s?.access_token) {
                await fetchDbUser(s.access_token);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
            setSession(s);
            if (s?.access_token) {
                await fetchDbUser(s.access_token);
            } else {
                setDbUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchDbUser]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setDbUser(null);
        // Clear any residual localStorage
        ['userId', 'userEmail', 'studentName', 'studentEmail', 'authToken',
            'userType', 'staffRole', 'studentClasses', 'studentGrades',
            'loginMethod', 'selectedUniversity', 'savedCourses', 'quizResults',
            'journalEntries', 'upgradeFor', 'transcriptData'].forEach(k => localStorage.removeItem(k));
        window.location.href = '/';
    }, []);

    const refreshDbUser = useCallback(async () => {
        if (session?.access_token) {
            await fetchDbUser(session.access_token);
        }
    }, [session, fetchDbUser]);

    return (
        <AuthContext.Provider value={{
            session,
            user: session?.user || null,
            dbUser,
            loading,
            accessToken: session?.access_token || null,
            signOut,
            refreshDbUser,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
