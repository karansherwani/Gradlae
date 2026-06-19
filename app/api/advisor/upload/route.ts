// app/api/advisor/upload/route.ts
// General-purpose file upload for the AI advisor.
// Handles transcripts (structured parsing) and any other PDFs (raw text extraction).

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Only accept PDFs
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json(
                { error: 'Only PDF files are supported at this time.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Server-side PDF parsing is disabled. Upload PDFs through the browser advisor chat so they can be parsed client-side.' },
            { status: 415 },
        );
    } catch (error) {
        console.error('Advisor upload error:', error);
        return NextResponse.json(
            { error: 'Failed to process file: ' + (error as Error).message },
            { status: 500 }
        );
    }
}
