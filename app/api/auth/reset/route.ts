// app/api/auth/reset/route.ts
// Password reset request — sends Supabase's verified recovery email.
// Completion happens on /auth/reset after the user clicks the email link.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { resetSchema, validateBody } from '@/app/lib/validation';
import { buildNetIdEmail, getCompatibleEmailCandidates } from '@/app/lib/universities';

function getResetRedirectUrl(request: NextRequest): string {
    const configured = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
    const origin = request.headers.get('origin') || configured || request.nextUrl.origin;
    return `${origin}/auth/reset`;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = validateBody(resetSchema, body);
        if (!validation.success) {
            return NextResponse.json({ message: validation.error }, { status: 400 });
        }

        const { email, netId, staffId, university } = validation.data;
        const identifier = email
            || (netId ? buildNetIdEmail(netId, university) : null)
            || (staffId ? buildNetIdEmail(staffId, university) : null);

        if (!identifier) {
            return NextResponse.json(
                { message: 'Email, NetID, or Staff ID is required' },
                { status: 400 },
            );
        }

        const redirectTo = getResetRedirectUrl(request);
        const candidates = getCompatibleEmailCandidates(identifier, university);

        for (const candidateEmail of candidates) {
            const { error } = await supabaseAdmin.auth.resetPasswordForEmail(candidateEmail, {
                redirectTo,
            });

            if (error) {
                console.error('Password reset email error:', error.message);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'If that account exists, a password reset email has been sent.',
        });
    } catch (error) {
        console.error('Reset error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
