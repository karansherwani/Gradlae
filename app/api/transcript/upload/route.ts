// app/api/transcript/upload/route.ts
// Upload a PDF transcript → store in Supabase Storage + parse → save parsed JSON.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseServer';
import { getUserFromRequest } from '@/app/lib/supabaseAuth';
import { parseTranscriptPDF } from '@/app/lib/pdfParser';

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
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

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

        // 4. Parse the transcript
        const transcript = await parseTranscriptPDF(buffer);

        // Normalize to a clean JSON structure
        const parsedJson = {
            studentInfo: transcript.studentInfo,
            courses: transcript.courses.map(c => ({
                course: c.course,
                description: c.description,
                grade: c.grade,
                credits: c.credits,
                term: c.term,
                isRetake: c.isRetake || false,
                bestGrade: c.bestGrade || c.grade,
            })),
            totalCourses: transcript.courses.length,
            parsedAt: new Date().toISOString(),
        };

        // 5. Upsert a row in the transcripts table
        //    (delete previous transcript for this user, insert new)
        await supabaseAdmin
            .from('transcripts')
            .delete()
            .eq('user_id', user.id);

        const { data: transcriptRow, error: insertError } = await supabaseAdmin
            .from('transcripts')
            .insert({
                user_id: user.id,
                raw_file_url: uploadError ? null : storagePath,
                parsed_json: parsedJson,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Transcript insert error:', insertError.message);
            return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            transcriptId: transcriptRow.id,
            courses: parsedJson.courses,
            totalCourses: parsedJson.totalCourses,
            studentInfo: parsedJson.studentInfo,
            storagePath: uploadError ? null : storagePath,
        });
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
