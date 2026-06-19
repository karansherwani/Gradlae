// lib/supabaseServer.ts
// Server-side Supabase client – uses the SERVICE ROLE key.
// NEVER import this file in client components or expose the key.
// Use only inside API routes, server actions, or server components.
//
// Includes a DNS-resilient fetch wrapper that falls back to public DNS
// (Google 8.8.8.8 / Cloudflare 1.1.1.1) when the system resolver fails.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dns from 'dns';

// ─── DNS-resilient fetch ────────────────────────────────────────────────────
// On some networks (especially macOS with certain routers), the system DNS
// resolver (getaddrinfo) fails to resolve *.supabase.co while direct DNS
// queries work fine. This wrapper detects that failure and retries using a
// resolved IP address.

const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

// Cache resolved IPs for 5 minutes to avoid hammering DNS
const dnsCache = new Map<string, { ip: string; expires: number }>();
const DNS_CACHE_TTL = 5 * 60 * 1000;

async function resolveHostname(hostname: string): Promise<string> {
    const cached = dnsCache.get(hostname);
    if (cached && cached.expires > Date.now()) {
        return cached.ip;
    }

    return new Promise((resolve, reject) => {
        resolver.resolve4(hostname, (err, addresses) => {
            if (err || !addresses?.length) {
                reject(err || new Error(`Could not resolve ${hostname}`));
            } else {
                const ip = addresses[0];
                dnsCache.set(hostname, { ip, expires: Date.now() + DNS_CACHE_TTL });
                resolve(ip);
            }
        });
    });
}

async function resilientFetch(
    input: string | URL | Request,
    init?: RequestInit,
): Promise<Response> {
    try {
        // Try normal fetch first
        return await fetch(input, init);
    } catch (err) {
        // Only retry on DNS resolution failures
        const errorLike = err as { cause?: { code?: string }; code?: string; message?: string };
        const message = errorLike.cause?.code || errorLike.code || errorLike.message || '';
        if (
            typeof message === 'string' &&
            (message.includes('ENOTFOUND') || message.includes('getaddrinfo'))
        ) {
            // Extract the URL
            const url = typeof input === 'string'
                ? new URL(input)
                : input instanceof URL
                    ? input
                    : new URL((input as Request).url);

            const hostname = url.hostname;

            try {
                const ip = await resolveHostname(hostname);

                // Replace hostname with IP, keep the Host header
                const newUrl = new URL(url.toString());
                newUrl.hostname = ip;

                const headers = new Headers(init?.headers || {});
                if (!headers.has('Host')) {
                    headers.set('Host', hostname);
                }

                // For HTTPS with IP, Node's fetch needs the servername for TLS/SNI.
                // The standard fetch API handles this via the Host header.
                return await fetch(newUrl.toString(), {
                    ...init,
                    headers,
                    // @ts-expect-error — Node.js-specific undici option for TLS SNI
                    dispatcher: undefined,
                });
            } catch {
                // If DNS fallback also fails, throw the original error
                throw err;
            }
        }

        throw err;
    }
}

// ─── Supabase Admin Client ─────────────────────────────────────────────────

let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
    if (_supabaseAdmin) return _supabaseAdmin;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
            'Missing Supabase server env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        );
    }

    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
            fetch: resilientFetch,
        },
    });

    return _supabaseAdmin;
}

// Lazy getter – only throws when actually called at runtime, not at import time.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        const admin = getSupabaseAdmin();
        return (admin as unknown as Record<string | symbol, unknown>)[prop];
    },
});
