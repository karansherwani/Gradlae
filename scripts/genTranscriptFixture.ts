// Utility to (re)generate the sanitized transcript text fixture used by the
// parser unit tests. Runs the SAME column-aware layout logic as the browser
// pipeline (via the pure `layoutItemsToText` helper) against a local PDF, then
// scrubs personally identifying data before writing the fixture.
//
//   npx tsx scripts/genTranscriptFixture.ts <path-to.pdf> <output.txt>
//
// The source PDF is never committed; only the sanitized text is.

import fs from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { layoutItemsToText, PositionedItem } from '../app/lib/browserPdfText';

async function main() {
    const pdfPath = process.argv[2];
    const outPath = process.argv[3];
    if (!pdfPath || !outPath) {
        console.error('Usage: tsx scripts/genTranscriptFixture.ts <input.pdf> <output.txt>');
        process.exit(1);
    }

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await getDocument({ data, useSystemFonts: true }).promise;

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const items: PositionedItem[] = content.items.flatMap((item: unknown) => {
            if (typeof item !== 'object' || item === null || !('str' in item)) return [];
            const str = String((item as { str: unknown }).str ?? '');
            if (!str.trim()) return [];
            const transform = (item as { transform?: number[] }).transform || [1, 0, 0, 1, 0, 0];
            const width = typeof (item as { width?: number }).width === 'number' ? (item as { width: number }).width : 0;
            return [{ text: str.trim(), x: transform[4] || 0, y: transform[5] || 0, width }];
        });
        pages.push(`--- PAGE ${pageNumber} ---\n${layoutItemsToText(items)}`);
    }

    const sanitized = pages
        .join('\n')
        // Scrub PII with stable placeholder values the tests can assert on.
        .replace(/Name:\s*[^\n]*?(?=\s+Page\b|\n)/gi, 'Name: Test Student')
        .replace(/Student ID:\s*\d+/gi, 'Student ID: 12345678')
        .replace(/Birthdate:\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/gi, 'Birthdate: 01/01/2000')
        .replace(/Print Date:\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/gi, 'Print Date: 01/01/2000');

    fs.writeFileSync(outPath, sanitized + '\n');
    console.log(`Wrote fixture to ${outPath} (${sanitized.length} chars)`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
