// Shared transcript-from-PDF pipeline used by both the My Courses page and the
// in-chat advisor upload. Consolidating the logic here prevents the two call
// sites from drifting apart (they previously used different extraction paths).
//
// Design choices implemented (see docs/transcript-parser-redesign.md):
//   A2 – run multiple extraction strategies and keep the best-scoring parse.
//   F2 – return signal metadata so callers can show a specific error message.

import {
    extractPdfTextInBrowser,
    extractTranscriptLayoutInBrowser,
} from './browserPdfText';
import { parseTranscriptText, ParsedTranscript } from './transcriptTextParser';

export type ExtractionMethod = 'column-layout' | 'basic' | 'none';

export interface TranscriptParseMeta {
    /** The PDF had a usable text layer (i.e. not a scan/image). */
    hasText: boolean;
    /** The extracted text contains recognizable transcript markers. */
    looksLikeTranscript: boolean;
    courseCount: number;
    termCount: number;
    method: ExtractionMethod;
}

export interface TranscriptParseResult {
    transcript: ParsedTranscript;
    meta: TranscriptParseMeta;
    /** Naive text extraction (kept for advisement-report / generic doc fallback). */
    rawText: string;
    /** Column-aware layout extraction. */
    layoutText: string;
}

const TRANSCRIPT_MARKERS = /(Unofficial|Official)\s+Transcript|Academic\s+Program\s+History|Term\s+GPA|Cum\s+GPA|Beginning\s+of\s+.*Record|Student\s+ID/i;
const COURSE_ROW = /[A-Z]{2,4}\s+\d{3}[A-Z0-9]{0,3}\s+.+?\s+\d+\.\d{3}\s+\d+\.\d{3}/;
const TERM_HEADER = /^(Fall|Spring|Summer|Winter)\s+20\d{2}\b/im;

function alphanumericLength(text: string): number {
    return (text.match(/[A-Za-z0-9]/g) || []).length;
}

function distinctTermCount(transcript: ParsedTranscript): number {
    return new Set(
        transcript.courses.map(c => c.term).filter(t => t && t !== 'Unknown Term'),
    ).size;
}

/**
 * Higher is better. Rewards more courses, more distinct terms, and graded
 * (non in-progress) rows so a noisier extraction that happens to surface a few
 * extra fragments cannot outrank a clean one.
 */
function scoreTranscript(transcript: ParsedTranscript): number {
    const graded = transcript.courses.filter(c => c.grade && c.grade !== 'IP').length;
    return transcript.courses.length * 10 + distinctTermCount(transcript) * 3 + graded;
}

function looksLikeTranscript(text: string): boolean {
    return TRANSCRIPT_MARKERS.test(text) || TERM_HEADER.test(text) || COURSE_ROW.test(text);
}

export async function parseTranscriptFromPdf(file: File): Promise<TranscriptParseResult> {
    // A2: try both strategies. Layout is usually best for UAccess, but keep the
    // naive extraction as an independent candidate and for the non-transcript
    // document fallbacks that downstream callers rely on.
    const [layoutText, rawText] = await Promise.all([
        extractTranscriptLayoutInBrowser(file).catch(() => ''),
        extractPdfTextInBrowser(file).catch(() => ''),
    ]);

    const candidates: Array<{ method: ExtractionMethod; transcript: ParsedTranscript }> = [
        { method: 'column-layout', transcript: parseTranscriptText(layoutText) },
        { method: 'basic', transcript: parseTranscriptText(rawText) },
    ];

    candidates.sort((a, b) => scoreTranscript(b.transcript) - scoreTranscript(a.transcript));
    const best = candidates[0];

    const combinedText = `${layoutText}\n${rawText}`;
    const hasText = alphanumericLength(combinedText) > 30;

    const meta: TranscriptParseMeta = {
        hasText,
        looksLikeTranscript: looksLikeTranscript(combinedText),
        courseCount: best.transcript.courses.length,
        termCount: distinctTermCount(best.transcript),
        method: best.transcript.courses.length > 0 ? best.method : 'none',
    };

    return { transcript: best.transcript, meta, rawText, layoutText };
}

/**
 * F2: turn parse metadata into a specific, actionable error message when no
 * courses were found. Distinguishes scanned PDFs, wrong documents, and
 * unexpected transcript layouts instead of a single generic message.
 */
export function describeTranscriptFailure(meta: TranscriptParseMeta): string {
    if (!meta.hasText) {
        return 'This PDF has no selectable text — it looks like a scan or photo. Please upload a text-based PDF exported from UAccess (use Print → Save as PDF), not a screenshot or image.';
    }
    if (!meta.looksLikeTranscript) {
        return 'This file doesn\'t look like a UAccess transcript. Please make sure you\'re uploading your unofficial transcript, not an exam, syllabus, or advisement report.';
    }
    return 'We could read the PDF but couldn\'t recognize any course rows. The transcript layout may be unusual — try re-exporting it from UAccess, or report this so we can add support for your format.';
}
