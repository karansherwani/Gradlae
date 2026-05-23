'use client';

import { AuthProvider } from './AuthProvider';
import PaceMatchChatWidget from './PaceMatchChatWidget';
import CookieConsent from './CookieConsent';
import { AnalyticsProvider } from './AnalyticsProvider';

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
