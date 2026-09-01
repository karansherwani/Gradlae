// Browser-side PDF text extraction helpers built on pdfjs-dist.
//
// Extraction is intentionally split into small, PURE helpers (no pdfjs, no DOM)
// so the column-detection and row-grouping logic can be unit tested with
// synthetic coordinate data. See docs/transcript-parser-redesign.md.

export interface PositionedItem {
    text: string;
    x: number; // left edge (PDF user-space units)
    y: number; // baseline y (higher = closer to top of page)
    width: number; // item width in the same units; 0 when unknown
}

export interface ColumnSplit {
    isMultiColumn: boolean;
    separatorX: number | null;
}

const ROW_TOLERANCE = 3;

// ─── Pure helpers (unit-testable without pdfjs) ──────────────────────────────

/**
 * Detect whether a page uses a two-column layout and, if so, where to split.
 *
 * Strategy (B2 sanity-checked with B1): UAccess columns are contiguous — there
 * is rarely true whitespace between them — so instead of looking for an empty
 * gap we build a vertical coverage histogram and look for a *valley*: a central
 * x-band that far fewer text items cross than the column bodies on either side.
 * B1 is used as a guard: the valley must sit near the page midpoint and have
 * substantial content and density on both sides, so a wide description or an
 * indented block is not mistaken for a column boundary.
 *
 * MARKED FOR TESTING (design choice B): the valley ratio and midpoint tolerance
 * are heuristics tuned against UAccess transcripts. See the design doc.
 */
export function detectColumnSplit(items: PositionedItem[]): ColumnSplit {
    const usable = items.filter(item => item.text.trim().length > 0);
    if (usable.length < 12) return { isMultiColumn: false, separatorX: null };

    const minX = Math.min(...usable.map(i => i.x));
    const maxX = Math.max(...usable.map(i => i.x + (i.width || 0)));
    const contentWidth = maxX - minX;
    if (contentWidth <= 0) return { isMultiColumn: false, separatorX: null };

    // Coverage COUNT histogram: how many item spans cross each x-bucket.
    const bucketCount = 120;
    const bucketWidth = contentWidth / bucketCount;
    const counts = new Array<number>(bucketCount).fill(0);
    for (const item of usable) {
        const start = Math.max(0, Math.floor((item.x - minX) / bucketWidth));
        const end = Math.min(bucketCount - 1, Math.floor((item.x + (item.width || 0) - minX) / bucketWidth));
        for (let b = start; b <= end; b++) counts[b]++;
    }

    // Search the central band [30%, 70%] for the lowest-density (valley) bucket.
    const lo = Math.floor(bucketCount * 0.30);
    const hi = Math.ceil(bucketCount * 0.70);
    let valleyBucket = -1;
    let valleyCount = Infinity;
    for (let b = lo; b <= hi; b++) {
        if (counts[b] < valleyCount) {
            valleyCount = counts[b];
            valleyBucket = b;
        }
    }
    if (valleyBucket < 0) return { isMultiColumn: false, separatorX: null };

    const separatorX = minX + (valleyBucket + 0.5) * bucketWidth;

    // Representative column density = median of non-empty buckets.
    const positive = counts.filter(c => c > 0).sort((a, b) => a - b);
    if (positive.length === 0) return { isMultiColumn: false, separatorX: null };
    const colDensity = positive[Math.floor(positive.length / 2)];

    // A real valley is far less dense than the column bodies…
    if (valleyCount > colDensity * 0.4) return { isMultiColumn: false, separatorX: null };

    // …and both sides must actually contain dense column bodies.
    const leftPeak = Math.max(...counts.slice(0, valleyBucket + 1));
    const rightPeak = Math.max(...counts.slice(valleyBucket));
    if (leftPeak < colDensity * 0.8 || rightPeak < colDensity * 0.8) {
        return { isMultiColumn: false, separatorX: null };
    }

    // B1 sanity: the separator must be reasonably central (columns can be uneven).
    const midpoint = minX + contentWidth / 2;
    if (Math.abs(separatorX - midpoint) > contentWidth * 0.30) {
        return { isMultiColumn: false, separatorX: null };
    }

    // Require a meaningful number of items on both sides.
    const leftItems = usable.filter(i => itemCenter(i) < separatorX).length;
    const rightItems = usable.length - leftItems;
    const minSide = Math.max(4, Math.floor(usable.length * 0.2));
    if (leftItems < minSide || rightItems < minSide) {
        return { isMultiColumn: false, separatorX: null };
    }

    return { isMultiColumn: true, separatorX };
}

function itemCenter(item: PositionedItem): number {
    return item.x + (item.width || 0) / 2;
}

/** Group positioned items into visual rows (top-to-bottom) and render as text lines. */
export function itemsToLines(items: PositionedItem[], rowTolerance = ROW_TOLERANCE): string[] {
    const usable = items.filter(item => item.text.trim().length > 0);
    if (usable.length === 0) return [];

    const rows: Array<{ y: number; items: PositionedItem[] }> = [];
    for (const item of [...usable].sort((a, b) => b.y - a.y)) {
        const row = rows.find(existing => Math.abs(existing.y - item.y) <= rowTolerance);
        if (row) {
            row.items.push(item);
            row.y = (row.y + item.y) / 2;
        } else {
            rows.push({ y: item.y, items: [item] });
        }
    }

    return rows
        .sort((a, b) => b.y - a.y)
        .map(row => row.items
            .sort((a, b) => a.x - b.x)
            .map(i => i.text.trim())
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim())
        .filter(Boolean);
}

/**
 * Render one page's positioned items to text. When a two-column layout is
 * detected the left column is emitted in full and then the right column, so
 * each column's term headers precede its own course rows (linearization that
 * lets the string parser attribute terms correctly — design choice D3 via E1).
 */
export function layoutItemsToText(items: PositionedItem[]): string {
    const split = detectColumnSplit(items);

    if (!split.isMultiColumn || split.separatorX === null) {
        return itemsToLines(items).join('\n');
    }

    const left = items.filter(i => itemCenter(i) < split.separatorX!);
    const right = items.filter(i => itemCenter(i) >= split.separatorX!);
    return [...itemsToLines(left), ...itemsToLines(right)].join('\n');
}

// ─── pdfjs-backed extraction ────────────────────────────────────────────────

async function loadPdf(file: File) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const data = new Uint8Array(await file.arrayBuffer());
    return pdfjs.getDocument({ data }).promise;
}

function toPositionedItems(content: { items: unknown[] }): PositionedItem[] {
    return content.items.flatMap((item) => {
        if (typeof item !== 'object' || item === null || !('str' in item)) return [];
        const str = String((item as { str: unknown }).str ?? '');
        if (!str.trim()) return [];
        const transform = 'transform' in item && Array.isArray((item as { transform: unknown }).transform)
            ? (item as { transform: number[] }).transform
            : [1, 0, 0, 1, 0, 0];
        const width = 'width' in item && typeof (item as { width: unknown }).width === 'number'
            ? (item as { width: number }).width
            : 0;
        return [{
            text: str.trim(),
            x: Number(transform[4]) || 0,
            y: Number(transform[5]) || 0,
            width,
        }];
    });
}

/** Naive extraction: joins raw text items with newlines (no layout awareness). */
export async function extractPdfTextInBrowser(file: File): Promise<string> {
    const pdf = await loadPdf(file);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join('\n');
        pages.push(text);
    }

    return pages.join('\n');
}

/** Single-column layout reconstruction (kept for advisement-report parsing). */
export async function extractPdfTextWithLayoutInBrowser(file: File): Promise<string> {
    const pdf = await loadPdf(file);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = itemsToLines(toPositionedItems(content)).join('\n');
        pages.push(`--- PAGE ${pageNumber} ---\n${pageText}`);
    }

    return pages.join('\n');
}

/**
 * Column-aware layout reconstruction. Splits two-column UAccess pages into
 * separate columns before rendering rows, which recovers courses and terms
 * that the single-column reconstruction merges together.
 */
export async function extractTranscriptLayoutInBrowser(file: File): Promise<string> {
    const pdf = await loadPdf(file);
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = layoutItemsToText(toPositionedItems(content));
        pages.push(`--- PAGE ${pageNumber} ---\n${pageText}`);
    }

    return pages.join('\n');
}
