// app/api/transcript/upload/route.ts
// Upload a PDF transcript → store in Supabase Storage + parse → save parsed JSON.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Read the file from form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 });
        }
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const header = Array.from(buffer.slice(0, 4));
        if (!PDF_MAGIC_BYTES.every((byte, index) => header[index] === byte)) {
            return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 });
        }

        // 3. Upload raw PDF to Supabase Storage
        const storagePath = `${user.authId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from('transcripts')
            .upload(storagePath, buffer, {
                contentType: 'application/pdf',
                upsert: false,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError.message);
            // Continue — we can still parse even if storage upload fails
        }

        return NextResponse.json(
            {
                error: 'Server-side PDF parsing is disabled on Vercel. Parse the PDF in the browser and send parsed transcript JSON to /api/upload.',
                storagePath: uploadError ? null : storagePath,
            },
            { status: 415 },
        );
    } catch (error) {
        console.error('Transcript upload error:', error);
        return NextResponse.json(
            { error: 'Failed to process transcript: ' + (error as Error).message },
            { status: 500 }
        );
    }
}

// GET – retrieve the latest transcript for the authenticated user
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: transcript } = await supabaseAdmin
            .from('transcripts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!transcript) {
            return NextResponse.json({ hasTranscript: false, courses: [] });
        }

        const parsed = transcript.parsed_json as {
            courses: Array<{ course: string; description: string; grade: string; credits: number; term: string }>;
            studentInfo: { name: string | null };
        };

        return NextResponse.json({
            hasTranscript: true,
            transcriptId: transcript.id,
            courses: parsed.courses || [],
            totalCourses: parsed.courses?.length || 0,
            studentInfo: parsed.studentInfo || {},
            storagePath: transcript.raw_file_url,
            createdAt: transcript.created_at,
        });
    } catch (error) {
        console.error('Transcript fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
    }
}
