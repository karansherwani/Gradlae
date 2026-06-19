'use client';

import React, { createContext, useContext, useEffect, useCallback, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

interface AnalyticsContextValue {
    trackEvent: (action: string, category: string, label?: string, value?: number) => void;
}

type GtagCommand = 'config' | 'event' | 'js';
type GtagParams = Record<string, string | number | boolean | Date | undefined>;

declare global {
    interface Window {
        gtag?: (command: GtagCommand, targetId: string | Date, params?: GtagParams) => void;
    }
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
    trackEvent: () => {},
});

export const useAnalytics = () => useContext(AnalyticsContext);

// Dynamic tracking component wrapped in Suspense to prevent Next.js prerender errors
function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
        
        // Google Analytics integration (gtag.js)
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
                page_path: url,
            });
        }
    }, [pathname, searchParams]);

    return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    // Custom Event tracking helper
    const trackEvent = useCallback((action: string, category: string, label?: string, value?: number) => {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', action, {
                event_category: category,
                event_label: label,
                value: value,
            });
        }
    }, []);

    // Global click tracking via document-level event delegation
    // No wrapping <div> needed — eliminates extra DOM node and React overhead
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const clickable = target.closest('button, a');
            if (clickable) {
                const label = clickable.textContent?.trim() || clickable.getAttribute('aria-label') || 'unlabeled';
                const id = clickable.id || 'no-id';
                trackEvent('click', 'Student Engagement', `${label} (ID: ${id})`);
            }
        };

        document.addEventListener('click', handleClick, { passive: true });
        return () => document.removeEventListener('click', handleClick);
    }, [trackEvent]);

    const gaId = process.env.NEXT_PUBLIC_GA_ID;

    return (
        <AnalyticsContext.Provider value={{ trackEvent }}>
            {gaId && (
                <>
                    <Script
                        strategy="afterInteractive"
                        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                    />
                    <Script
                        id="google-analytics"
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${gaId}', {
                                    page_path: window.location.pathname,
                                });
                            `,
                        }}
                    />
                </>
            )}

            <Suspense fallback={null}>
                <AnalyticsTracker />
            </Suspense>
            
            {children}
        </AnalyticsContext.Provider>
    );
}
