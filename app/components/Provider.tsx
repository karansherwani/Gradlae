'use client';

import { AuthProvider } from './AuthProvider';
import PaceMatchChatWidget from './PaceMatchChatWidget';

export default function Provider({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <PaceMatchChatWidget />
        </AuthProvider>
    );
}
