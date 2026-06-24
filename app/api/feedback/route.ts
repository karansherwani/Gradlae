import { NextRequest, NextResponse } from 'next/server';
import { feedbackSchema, validateBody } from '@/app/lib/validation';

export async function POST(request: NextRequest) {
    try {
        const validation = validateBody(feedbackSchema, await request.json());
        if (!validation.success) {
            return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
        }
        const { name, email, type, message } = validation.data;

        const newFeedback = {
            id: Math.floor(Math.random() * 900000 + 100000),
            timestamp: new Date().toISOString(),
            name,
            email,
            type,
            message,
        };

        // Server-side audit log without storing contact details in logs.
        console.info(`[Feedback Received] ID: ${newFeedback.id} | Type: ${type}`);

        return NextResponse.json({
            success: true,
            message: 'Feedback submitted successfully. Thank you for helping us improve!',
            feedbackId: newFeedback.id,
        });
    } catch (error) {
        console.error('[Feedback API] Internal Server Error:', error);
        return NextResponse.json(
            { success: false, message: 'An unexpected server error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
