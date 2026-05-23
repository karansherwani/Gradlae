// lib/pdfParser.ts
// Server-side PDF text extraction plus shared transcript text parsing.
import { PDFParse } from 'pdf-parse';
import {
    CourseGrade,
    ParsedTranscript,
    StudentInfo,
    parseTranscriptText,
} from './transcriptTextParser';

export type { CourseGrade, ParsedTranscript, StudentInfo };

export async function parseTranscriptPDF(buffer: Buffer): Promise<ParsedTranscript> {
    try {
        const uint8Array = new Uint8Array(buffer);
        const pdfParser = new PDFParse({ data: uint8Array });
        const result = await pdfParser.getText();
        return parseTranscriptText(result.text);
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error(`Failed to parse transcript PDF: ${(error as Error).message}`);
    }
}

export async function parseTranscriptImage(_buffer: Buffer): Promise<CourseGrade[]> {
    return [];
}
