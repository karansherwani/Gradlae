'use client';

import { useState, useEffect } from 'react';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('gradlae_cookie_consent');
        if (!consent) {
            // Delay showing the banner for 1.5s to let other page content load smoothly
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAcceptAll = () => {
        localStorage.setItem('gradlae_cookie_consent', 'accepted_all');
        setIsVisible(false);
    };

    const handleRejectAll = () => {
        localStorage.setItem('gradlae_cookie_consent', 'rejected_all');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            right: '24px',
            maxWidth: '520px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: "'Inter', -apple-system, sans-serif",
            animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
            <style jsx>{`
                @keyframes slideUp {
                    from {
                        transform: translateY(100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                    background: 'rgba(0, 51, 102, 0.08)',
                    borderRadius: '10px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#003366',
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                        <path d="M8.5 8.5v.01" strokeWidth="3" />
                        <path d="M16 15.5v.01" strokeWidth="3" />
                        <path d="M12 12v.01" strokeWidth="3" />
                        <path d="M11 16v.01" strokeWidth="3" />
                        <path d="M7.5 13v.01" strokeWidth="3" />
                    </svg>
                </div>
                <div>
                    <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: '#0f172a',
                    }}>Cookie &amp; Privacy Consent</h4>
                    <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        lineHeight: '1.4',
                        color: '#475569',
                    }}>
                        Gradlae uses essential cookies and light tracking to optimize batch placement logic and course recommendations. Read our <a href="/privacy" style={{ color: '#003366', textDecoration: 'underline', fontWeight: 500 }}>Privacy Policy</a> and <a href="/terms" style={{ color: '#003366', textDecoration: 'underline', fontWeight: 500 }}>Terms</a> for details.
                    </p>
                </div>
            </div>

            <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
            }}>
                <button 
                    onClick={handleRejectAll}
                    style={{
                        background: 'transparent',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                >
                    Reject
                </button>
                <button 
                    onClick={handleAcceptAll}
                    style={{
                        background: '#003366',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: '#ffffff',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0, 51, 102, 0.1)',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#002244';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#003366';
                    }}
                >
                    Accept All
                </button>
            </div>
        </div>
    );
}
