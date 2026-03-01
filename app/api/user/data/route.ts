// app/api/user/data/route.ts
// User data management: view summary + delete all personal data.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

// GET – summary of what data is stored for this user
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Transcript
        const { data: transcript } = await supabaseAdmin
            .from('transcripts')
            .select('id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // Planner
        const { data: planner } = await supabaseAdmin
            .from('planners')
            .select('id, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        // Advisor sessions count
        const { count: sessionCount } = await supabaseAdmin
            .from('advisor_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                school: user.school,
            },
            data: {
                transcriptUploaded: !!transcript,
                transcriptDate: transcript?.created_at || null,
                plannerSaved: !!planner,
                plannerLastUpdated: planner?.updated_at || null,
                advisorSessions: sessionCount || 0,
            },
        });
    } catch (error) {
        console.error('User data summary error:', error);
        return NextResponse.json({ error: 'Failed to fetch data summary' }, { status: 500 });
    }
}

// DELETE – remove ALL user data (transcripts, planners, advisor sessions)
export async function DELETE(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete storage files
        const { data: files } = await supabaseAdmin.storage
            .from('transcripts')
            .list(user.authId);

        if (files && files.length > 0) {
            const paths = files.map(f => `${user.authId}/${f.name}`);
            await supabaseAdmin.storage.from('transcripts').remove(paths);
        }

        // Delete DB rows (cascade should handle some of this, but be explicit)
        await supabaseAdmin.from('advisor_sessions').delete().eq('user_id', user.id);
        await supabaseAdmin.from('transcripts').delete().eq('user_id', user.id);
        await supabaseAdmin.from('planners').delete().eq('user_id', user.id);

        return NextResponse.json({
            success: true,
            message: 'All your data has been deleted.',
        });
    } catch (error) {
        console.error('User data deletion error:', error);
        return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
    }
}
