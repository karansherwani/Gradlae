'use client';

import { AuthProvider } from './AuthProvider';

export default function Provider({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
        </AuthProvider>
    );
}
