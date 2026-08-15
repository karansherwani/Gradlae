import fs from 'fs';
import path from 'path';
import type { DegreePlan } from '@/types';

const DEFAULT_DEGREE_PLAN_ID = 'bs-cse-2025-26';
const DEGREE_REQUIREMENTS_PATH = path.join(process.cwd(), 'data', 'degreeRequirements.json');

let cachedPlans: DegreePlan[] | null = null;

export function loadAllDegreePlans(): DegreePlan[] {
    if (cachedPlans) return cachedPlans;

    const raw = fs.readFileSync(DEGREE_REQUIREMENTS_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { plans: DegreePlan[] };
    cachedPlans = parsed.plans || [];
    return cachedPlans;
}

export function getDefaultDegreePlanId(): string {
    return DEFAULT_DEGREE_PLAN_ID;
}

export function loadDegreePlanById(planId?: string | null): DegreePlan | null {
    const plans = loadAllDegreePlans();
    if (!plans.length) return null;

    if (planId) {
        const match = plans.find((plan) => plan.id === planId);
        if (match) return match;
    }

    return plans.find((plan) => plan.id === DEFAULT_DEGREE_PLAN_ID) || plans[0] || null;
}

export function loadDegreePlanForMajor(major?: string | null): DegreePlan | null {
    const plans = loadAllDegreePlans();
    if (!plans.length) return null;

    if (major) {
        const majorLower = major.toLowerCase();
        const match = plans.find((plan) => plan.name.toLowerCase().includes(majorLower));
        if (match) return match;
    }

    return loadDegreePlanById(DEFAULT_DEGREE_PLAN_ID);
}

/** Shape stored in Supabase planners.planner_json */
export interface StoredPlannerData {
    plans: DegreePlan[];
    plannedCourseCodes?: string[];
    sourcePlanId?: string;
}

export function buildPlannerPayloadFromTemplate(plan: DegreePlan): StoredPlannerData {
    return {
        plans: [plan],
        plannedCourseCodes: [],
        sourcePlanId: plan.id,
    };
}

export function getPlannerTemplateContext(plannerJson: StoredPlannerData | null | undefined): DegreePlan | null {
    if (!plannerJson?.plans?.length) return null;
    return plannerJson.plans[0];
}
