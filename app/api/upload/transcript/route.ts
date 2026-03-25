import { NextRequest, NextResponse } from 'next/server';
import { parseTranscriptPDF, ParsedTranscript } from '@/app/lib/pdfParser';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Require authentication
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // SECURITY: Check file size (prevent DoS via large uploads)
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 10MB.' },
                { status: 413 }
            );
        }

        // Check MIME type
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Only PDF files are supported' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // SECURITY: Validate PDF magic bytes (MIME type alone is easily spoofed)
        const header = Array.from(buffer.slice(0, 4));
        if (!PDF_MAGIC_BYTES.every((b, i) => header[i] === b)) {
            return NextResponse.json(
                { error: 'Invalid PDF file' },
                { status: 400 }
            );
        }

        // Parse the PDF
        const transcript = await parseTranscriptPDF(buffer);

        return NextResponse.json({
            success: true,
            data: transcript
        });

    } catch (error) {
        console.error('Transcript upload error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to parse transcript. Please ensure the file is a valid PDF.',
                success: false
            },
            { status: 500 }
        );
    }
}
