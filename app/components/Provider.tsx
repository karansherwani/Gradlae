'use client';

import dynamic from 'next/dynamic';
import { AuthProvider } from './AuthProvider';
import { AnalyticsProvider } from './AnalyticsProvider';

// Lazy-load non-critical components — they are not needed for initial render
const PaceMatchChatWidget = dynamic(() => import('./PaceMatchChatWidget'), {
    ssr: false,
});

const CookieConsent = dynamic(() => import('./CookieConsent'), {
    ssr: false,
});

export default function Provider({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <AnalyticsProvider>
                {children}
                <PaceMatchChatWidget />
                <CookieConsent />
            </AnalyticsProvider>
        </AuthProvider>
    );
}
