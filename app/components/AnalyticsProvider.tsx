'use client';

import React, { createContext, useContext, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

interface AnalyticsContextValue {
    trackEvent: (action: string, category: string, label?: string, value?: number) => void;
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
        
        // Log to dev console for local auditing
        console.log(`[Analytics] PageView Tracked: ${url}`);

        // Google Analytics integration (gtag.js)
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
                page_path: url,
            });
        }
    }, [pathname, searchParams]);

    return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    // Custom Event tracking helper
    const trackEvent = (action: string, category: string, label?: string, value?: number) => {
        console.log(`[Analytics Event] ${category} -> ${action} ${label ? `(${label})` : ''} ${value !== undefined ? `: ${value}` : ''}`);

        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', action, {
                event_category: category,
                event_label: label,
                value: value,
            });
        }
    };

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
            
            {/* Global listener to track interactive student buttons/CTAs auto-magically */}
            <div 
                onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const clickable = target.closest('button, a');
                    if (clickable) {
                        const label = clickable.textContent?.trim() || clickable.getAttribute('aria-label') || 'unlabeled';
                        const id = clickable.id || 'no-id';
                        trackEvent('click', 'Student Engagement', `${label} (ID: ${id})`);
                    }
                }}
            >
                {children}
            </div>
        </AnalyticsContext.Provider>
    );
}
