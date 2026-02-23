// app/api/advisor/upload/route.ts
// General-purpose file upload for the AI advisor.
// Handles transcripts (structured parsing) and any other PDFs (raw text extraction).

import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';

// Lightweight check: does the text look like a UofA transcript?
function looksLikeTranscript(text: string): boolean {
    const indicators = [
        /(?:Fall|Spring|Summer)\s+20\d{2}/i,
        /(?:AHRS|EHRS)/i,
        /(?:Term\s*GPA|Cum\s*GPA)/i,
        /(?:Unofficial|Official)\s*Transcript/i,
        /[A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3}\s+.+?\s+\d+\.\d{3}/,
    ];
    let hits = 0;
    for (const pat of indicators) {
        if (pat.test(text)) hits++;
    }
    return hits >= 2; // at least 2 transcript-like patterns
}

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

        // Extract raw text from the PDF
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const pdfParser = new PDFParse({ data: uint8Array });
        const result = await pdfParser.getText();
        const rawText = result.text;

        if (!rawText || rawText.trim().length < 20) {
            return NextResponse.json(
                { error: 'Could not extract text from this PDF. It may be scanned or image-based.' },
                { status: 422 }
            );
        }

        const isTranscript = looksLikeTranscript(rawText);

        if (isTranscript) {
            // Forward to the transcript parser for structured extraction
            // We re-use the existing upload route internally
            const userId = formData.get('userId') as string;

            const transcriptFormData = new FormData();
            transcriptFormData.append('file', file);
            if (userId) transcriptFormData.append('userId', userId);

            // Use the origin from the request to call our own upload API
            const origin = request.nextUrl.origin;
            const res = await fetch(`${origin}/api/upload`, {
                method: 'POST',
                body: transcriptFormData,
            });
            const data = await res.json();

            if (res.ok && data.courses && data.courses.length > 0) {
                return NextResponse.json({
                    type: 'transcript',
                    courses: data.courses,
                    totalCourses: data.courses.length,
                    fileName: file.name,
                });
            }
            // Fall through to raw text if transcript parsing yielded no courses
        }

        // Generic document — return the raw text (trimmed to reasonable length)
        const MAX_TEXT_LENGTH = 15000; // ~4K tokens, enough for context
        const trimmedText = rawText.length > MAX_TEXT_LENGTH
            ? rawText.substring(0, MAX_TEXT_LENGTH) + '\n\n[... document truncated ...]'
            : rawText;

        return NextResponse.json({
            type: 'document',
            fileName: file.name,
            text: trimmedText,
            textLength: rawText.length,
            truncated: rawText.length > MAX_TEXT_LENGTH,
        });
    } catch (error) {
        console.error('Advisor upload error:', error);
        return NextResponse.json(
            { error: 'Failed to process file: ' + (error as Error).message },
            { status: 500 }
        );
    }
}
