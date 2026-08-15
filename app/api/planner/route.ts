// app/api/planner/route.ts
// CRUD for the user's degree planner stored in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import {
    buildPlannerPayloadFromTemplate,
    loadDegreePlanById,
    loadDegreePlanForMajor,
    type StoredPlannerData,
} from '@/app/lib/degreePlans';

async function ensurePlannerForUser(userId: string): Promise<StoredPlannerData | null> {
    const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('major, degree_plan_id')
        .eq('id', userId)
        .single();

    const { data: existing } = await supabaseAdmin
        .from('planners')
        .select('planner_json')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (existing?.planner_json) {
        return existing.planner_json as StoredPlannerData;
    }

    const template =
        loadDegreePlanById(userRow?.degree_plan_id) ||
        loadDegreePlanForMajor(userRow?.major) ||
        loadDegreePlanById(null);

    if (!template) return null;

    const payload = buildPlannerPayloadFromTemplate(template);
    await supabaseAdmin.from('planners').insert({
        user_id: userId,
        planner_json: payload,
    });

    return payload;
}

// GET – retrieve the latest planner for the authenticated user
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const plannerJson = await ensurePlannerForUser(user.id);
        if (!plannerJson) {
            return NextResponse.json({ hasPlanner: false, planner: null });
        }

        return NextResponse.json({
            hasPlanner: true,
            planner: plannerJson,
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

        const existingPayload = await ensurePlannerForUser(user.id);
        const mergedPlanner: StoredPlannerData = {
            ...(existingPayload || {}),
            ...(planner as StoredPlannerData),
            plans: (planner as StoredPlannerData).plans || existingPayload?.plans || [],
        };

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
                .update({ planner_json: mergedPlanner })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Insert new
            const { data, error } = await supabaseAdmin
                .from('planners')
                .insert({ user_id: user.id, planner_json: mergedPlanner })
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
