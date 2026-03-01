// app/api/auth/[...nextauth]/route.ts
// DEPRECATED: NextAuth is no longer used. Auth is handled by Supabase.
// This stub prevents 404s if anything still references the NextAuth endpoints.

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Redirect any NextAuth callback attempts to the auth page
    return NextResponse.redirect(new URL('/auth', request.url));
}

export async function POST(request: NextRequest) {
    return NextResponse.json(
        { message: 'NextAuth is no longer used. Please use /api/auth/signin or /api/auth/signup.' },
        { status: 410 }, // 410 Gone
    );
}
