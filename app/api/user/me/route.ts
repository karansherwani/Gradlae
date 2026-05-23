// app/api/user/me/route.ts
// Returns the current authenticated user's DB row.
// Used by the AuthProvider to hydrate the dbUser state.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                authId: user.authId,
                email: user.email,
                name: user.name,
                school: user.school,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('User me error:', error);
        return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
    }
}
