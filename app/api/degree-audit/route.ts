import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { runDegreeAudit } from '@/app/lib/degreeAudit';
import {
    buildPlannerPayloadFromTemplate,
    loadDegreePlanById,
    loadDegreePlanForMajor,
    type StoredPlannerData,
} from '@/app/lib/degreePlans';
import { normalizeCourseCode } from '@/app/lib/courseCodes';
import { transcriptCoursesToCompleted, type TranscriptCourseRow } from '@/app/lib/transcriptUtils';

async function resolveUserPlan(userId: string, major?: string | null, degreePlanId?: string | null) {
    const { data: plannerRow } = await supabaseAdmin
        .from('planners')
        .select('planner_json')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    const stored = plannerRow?.planner_json as StoredPlannerData | null | undefined;
    if (stored?.plans?.[0]) {
        return stored.plans[0];
    }

    const template =
        loadDegreePlanById(degreePlanId) ||
        loadDegreePlanForMajor(major) ||
        loadDegreePlanById(null);

    if (!template) return null;

    const payload = buildPlannerPayloadFromTemplate(template);
    await supabaseAdmin.from('planners').insert({
        user_id: userId,
        planner_json: payload,
    });

    return template;
}

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('major, degree_plan_id')
            .eq('id', user.id)
            .single();

        const plan = await resolveUserPlan(
            user.id,
            userRow?.major,
            userRow?.degree_plan_id,
        );

        if (!plan) {
            return NextResponse.json({ error: 'No degree plan available' }, { status: 404 });
        }

        const { data: transcriptRow } = await supabaseAdmin
            .from('transcripts')
            .select('parsed_json')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const transcriptCourses = ((transcriptRow?.parsed_json as { courses?: TranscriptCourseRow[] } | null)?.courses) || [];
        const completedCourses = transcriptCoursesToCompleted(transcriptCourses);
        const rawGrades = transcriptCourses
            .map((course) => ({
                courseId: normalizeCourseCode(course.course) || course.course,
                grade: (course.bestGrade || course.grade || '').toUpperCase(),
            }))
            .filter((entry) => entry.courseId);

        const audit = runDegreeAudit(plan, completedCourses, rawGrades);

        return NextResponse.json({
            hasTranscript: transcriptCourses.length > 0,
            audit,
        });
    } catch (error) {
        console.error('Degree audit error:', error);
        return NextResponse.json({ error: 'Failed to run degree audit' }, { status: 500 });
    }
}
