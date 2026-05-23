import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, type, message } = body;

        if (!name || !email || !type || !message) {
            return NextResponse.json(
                { success: false, message: 'All feedback fields are required' },
                { status: 400 }
            );
        }

        const newFeedback = {
            id: Math.floor(Math.random() * 900000 + 100000),
            timestamp: new Date().toISOString(),
            name,
            email,
            type,
            message,
        };

        // Ensure target directory exists in workspace
        const dirPath = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        const filePath = path.join(dirPath, 'feedback.json');
        let currentData = [];

        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                currentData = JSON.parse(fileContent);
            } catch (parseErr) {
                console.error('[Feedback API] JSON parse error, resetting data:', parseErr);
            }
        }

        currentData.push(newFeedback);
        fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2), 'utf-8');

        // Server-side audit log for feedback & bug reports
        console.log(`[Feedback Received] ID: ${newFeedback.id} | Type: ${type} | Name: ${name}`);

        return NextResponse.json({
            success: true,
            message: 'Feedback submitted successfully. Thank you for helping us improve!',
            feedbackId: newFeedback.id,
        });
    } catch (error: any) {
        console.error('[Feedback API] Internal Server Error:', error);
        return NextResponse.json(
            { success: false, message: 'An unexpected server error occurred: ' + error.message },
            { status: 500 }
        );
    }
}
