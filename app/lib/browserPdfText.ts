export async function extractPdfTextInBrowser(file: File): Promise<string> {
    const pdfjs = await import('pdfjs-dist');

    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];
    const isTextItem = (
        item: unknown,
    ): item is { str: string; transform?: number[] } => {
        return Boolean(
            item &&
            typeof item === 'object' &&
            'str' in item &&
            typeof (item as { str?: unknown }).str === 'string'
        );
    };

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const positionedItems = content.items
            .flatMap((item) => {
                if (!isTextItem(item) || !item.str.trim()) return [];
                const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
                return [{
                    text: item.str.trim(),
                    x: Number(transform[4]) || 0,
                    y: Number(transform[5]) || 0,
                }];
            })
            .sort((a, b) => {
                const yDelta = b.y - a.y;
                return Math.abs(yDelta) > 2 ? yDelta : a.x - b.x;
            });

        const rows: Array<{ y: number; items: typeof positionedItems }> = [];
        const rowTolerance = 3;

        for (const item of positionedItems) {
            const row = rows.find(existing => Math.abs(existing.y - item.y) <= rowTolerance);
            if (row) {
                row.items.push(item);
                row.y = (row.y + item.y) / 2;
            } else {
                rows.push({ y: item.y, items: [item] });
            }
        }

        const visualText = rows
            .sort((a, b) => b.y - a.y)
            .map(row => row.items
                .sort((a, b) => a.x - b.x)
                .map(item => item.text)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim())
            .filter(Boolean)
            .join('\n');

        // Keep a token stream as a fallback for PDFs whose rows are still split
        // into small fragments. The transcript parser can use both forms.
        const tokenText = positionedItems.map(item => item.text).join('\n');
        pages.push(`${visualText}\n\n--- TOKEN_STREAM ---\n${tokenText}`);
    }

    return pages.join('\n');
}
