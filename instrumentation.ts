// instrumentation.ts
// Next.js instrumentation hook – runs once when the server starts.
// Sets DNS result ordering to prefer IPv4, which helps on macOS.

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const dns = await import('dns');
        dns.setDefaultResultOrder('ipv4first');
    }
}
