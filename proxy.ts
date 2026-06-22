// proxy.ts
// Security proxy — adds security headers, rate limiting, and CSRF protection.
// This is the first line of defense for the entire application.

import { NextRequest, NextResponse } from 'next/server';

// ─── RATE LIMITING ─────────────────────────────────────────────────────────
// Simple in-memory rate limiter. For production at scale, use Redis or Upstash.

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Different limits for different route categories
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
    auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },    // 10 req / 15 min
    ai: { maxRequests: 30, windowMs: 60 * 1000 },            // 30 req / min
    upload: { maxRequests: 10, windowMs: 60 * 1000 },        // 10 req / min
    api: { maxRequests: 100, windowMs: 60 * 1000 },           // 100 req / min
};

function getRateLimitCategory(pathname: string): string {
    if (pathname.startsWith('/api/auth')) return 'auth';
    if (pathname.startsWith('/api/chat') || pathname.startsWith('/api/advisor')) return 'ai';
    if (pathname.startsWith('/api/upload')) return 'upload';
    return 'api';
}

function checkRateLimit(ip: string, category: string): boolean {
    const config = RATE_LIMITS[category] || RATE_LIMITS.api;
    const key = `${ip}:${category}`;
    const now = Date.now();

    for (const [entryKey, entry] of rateLimitMap) {
        if (now > entry.resetTime) {
            rateLimitMap.delete(entryKey);
        }
    }

    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
        return true;
    }

    if (entry.count >= config.maxRequests) {
        return false;
    }

    entry.count++;
    return true;
}

// ─── SECURITY HEADERS ──────────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): NextResponse {
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');
    // Prevent MIME sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');
    // XSS Protection (legacy browsers)
    response.headers.set('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions policy
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    );
    // Content Security Policy
    response.headers.set(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://*.supabase.co https://api.openai.com https://routellm.abacus.ai https://api.stripe.com https://www.google-analytics.com https://region1.google-analytics.com",
            "frame-src https://js.stripe.com https://hooks.stripe.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join('; '),
    );
    // Strict transport security (for HTTPS deployments)
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    return response;
}

// ─── PROXY ─────────────────────────────────────────────────────────────────

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip proxy for static files and _next internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|css|js)$/)
    ) {
        return NextResponse.next();
    }

    // ─── Rate Limiting ───
    if (pathname.startsWith('/api/')) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';

        const category = getRateLimitCategory(pathname);
        if (!checkRateLimit(ip, category)) {
            return addSecurityHeaders(
                NextResponse.json(
                    { error: 'Too many requests. Please try again later.' },
                    { status: 429 },
                ),
            );
        }
    }

    // ─── Add Security Headers to all responses ───
    const response = NextResponse.next();
    return addSecurityHeaders(response);
}

export const config = {
    matcher: [
        // Match all request paths except static files
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
