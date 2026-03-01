// app/api/user/journal/route.ts
// CRUD for journal entries — stored in Supabase journal_entries table.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

// GET - Retrieve all journal entries for the authenticated user
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: entries, error } = await supabaseAdmin
            .from('journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ entries: entries || [] });
    } catch (error) {
        console.error('Journal GET error:', error);
        return NextResponse.json({ error: 'Failed to retrieve journal entries' }, { status: 500 });
    }
}

// POST - Create a new journal entry
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, content } = await request.json();

        const { data: entry, error } = await supabaseAdmin
            .from('journal_entries')
            .insert({
                user_id: user.id,
                title: title || '',
                content: content || '',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, entry });
    } catch (error) {
        console.error('Journal POST error:', error);
        return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 });
    }
}

// PUT - Update a journal entry
export async function PUT(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { entryId, title, content } = await request.json();
        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('journal_entries')
            .update({ title: title || '', content: content || '' })
            .eq('id', entryId)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Journal PUT error:', error);
        return NextResponse.json({ error: 'Failed to update journal entry' }, { status: 500 });
    }
}

// DELETE - Delete a journal entry
export async function DELETE(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const entryId = request.nextUrl.searchParams.get('entryId');
        if (!entryId) {
            return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('journal_entries')
            .delete()
            .eq('id', entryId)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Journal DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete journal entry' }, { status: 500 });
    }
}
