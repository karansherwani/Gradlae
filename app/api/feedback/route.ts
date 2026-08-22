// app/api/feedback/route.ts
// Persist product feedback / bug reports to Supabase (public.feedback).
// Anonymous submissions are allowed. If the client sends a Bearer token and
// includeAccount=true, we optionally link the row to public.users.

import { NextRequest, NextResponse } from 'next/server';
import { feedbackSchema, validateBody } from '@/app/lib/validation';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

export async function POST(request: NextRequest) {
    try {
        const validation = validateBody(feedbackSchema, await request.json());
        if (!validation.success) {
            return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
        }

        const { name, email, type, message, includeAccount } = validation.data;

        let userId: string | null = null;
        if (includeAccount) {
            const user = await getUserFromRequest(request);
            userId = user?.id ?? null;
        }

        const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null;

        const { data, error } = await supabaseAdmin
            .from('feedback')
            .insert({
                name,
                email,
                type,
                message,
                status: 'new',
                user_id: userId,
                user_agent: userAgent,
            })
            .select('id')
            .single();

        if (error || !data) {
            console.error('[Feedback API] Insert failed:', error?.message);
            return NextResponse.json(
                { success: false, message: 'Unable to save feedback. Please try again.' },
                { status: 500 },
            );
        }

        console.info(`[Feedback Received] ID: ${data.id} | Type: ${type}`);

        return NextResponse.json({
            success: true,
            message: 'Feedback submitted successfully. Thank you for helping us improve!',
            feedbackId: data.id,
        });
    } catch (error) {
        console.error('[Feedback API] Internal Server Error:', error);
        return NextResponse.json(
            { success: false, message: 'An unexpected server error occurred. Please try again.' },
            { status: 500 },
        );
    }
}
