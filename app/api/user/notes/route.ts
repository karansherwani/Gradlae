// app/api/user/notes/route.ts
// User notes — uses saved_courses table's notes column in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

// GET - Retrieve user notes
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);

        if (!user) {
            // Fallback: query param
            const userId = request.nextUrl.searchParams.get('userId');
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', userId.toLowerCase())
                .single();

            if (!userRow) return NextResponse.json({ notes: '' });

            const { data: row } = await supabaseAdmin
                .from('saved_courses')
                .select('notes')
                .eq('user_id', userRow.id)
                .limit(1)
                .single();

            return NextResponse.json({ notes: row?.notes || '' });
        }

        const { data: row } = await supabaseAdmin
            .from('saved_courses')
            .select('notes')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        return NextResponse.json({ notes: row?.notes || '' });
    } catch (error) {
        console.error('Notes GET error:', error);
        return NextResponse.json({ error: 'Failed to retrieve notes' }, { status: 500 });
    }
}

// PUT - Update user notes
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { notes } = body;

        const user = await getUserFromRequest(request);

        if (!user) {
            const userId = body.userId;
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', userId.toLowerCase())
                .single();

            if (!userRow) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return saveNotesForUser(userRow.id, notes);
        }

        return saveNotesForUser(user.id, notes);
    } catch (error) {
        console.error('Notes PUT error:', error);
        return NextResponse.json({ error: 'Failed to update notes' }, { status: 500 });
    }
}

async function saveNotesForUser(userId: string, notes: string) {
    const { data: existing } = await supabaseAdmin
        .from('saved_courses')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .single();

    if (existing) {
        await supabaseAdmin
            .from('saved_courses')
            .update({ notes: notes || '' })
            .eq('id', existing.id);
    } else {
        await supabaseAdmin
            .from('saved_courses')
            .insert({ user_id: userId, notes: notes || '', courses_json: [] });
    }

    return NextResponse.json({ success: true });
}
