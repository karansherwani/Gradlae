// app/api/planner/route.ts
// CRUD for the user's degree planner stored in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

// GET – retrieve the latest planner for the authenticated user
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: planner } = await supabaseAdmin
            .from('planners')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (!planner) {
            return NextResponse.json({ hasPlanner: false, planner: null });
        }

        return NextResponse.json({
            hasPlanner: true,
            plannerId: planner.id,
            planner: planner.planner_json,
            updatedAt: planner.updated_at,
        });
    } catch (error) {
        console.error('Planner fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch planner' }, { status: 500 });
    }
}

// POST / PUT – upsert the planner
export async function POST(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { planner } = await request.json();
        if (!planner) {
            return NextResponse.json({ error: 'Planner data is required' }, { status: 400 });
        }

        // Check if user already has a planner
        const { data: existing } = await supabaseAdmin
            .from('planners')
            .select('id')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        let result;
        if (existing) {
            // Update existing
            const { data, error } = await supabaseAdmin
                .from('planners')
                .update({ planner_json: planner })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Insert new
            const { data, error } = await supabaseAdmin
                .from('planners')
                .insert({ user_id: user.id, planner_json: planner })
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return NextResponse.json({
            success: true,
            plannerId: result.id,
            updatedAt: result.updated_at,
        });
    } catch (error) {
        console.error('Planner save error:', error);
        return NextResponse.json({ error: 'Failed to save planner' }, { status: 500 });
    }
}

// DELETE – remove the planner
export async function DELETE(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await supabaseAdmin
            .from('planners')
            .delete()
            .eq('user_id', user.id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Planner delete error:', error);
        return NextResponse.json({ error: 'Failed to delete planner' }, { status: 500 });
    }
}
