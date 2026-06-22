export async function extractPdfTextInBrowser(file: File): Promise<string> {
    const pdfjs = await import('pdfjs-dist');

    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
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

export async function extractPdfTextWithLayoutInBrowser(file: File): Promise<string> {
    const pdfjs = await import('pdfjs-dist');

    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const positionedItems = content.items
            .flatMap((item) => {
                if (!('str' in item) || !item.str.trim()) return [];
                const transform = 'transform' in item && Array.isArray(item.transform)
                    ? item.transform
                    : [1, 0, 0, 1, 0, 0];

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

        const pageText = rows
            .sort((a, b) => b.y - a.y)
            .map(row => row.items
                .sort((a, b) => a.x - b.x)
                .map(item => item.text)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim())
            .filter(Boolean)
            .join('\n');

        pages.push(`--- PAGE ${pageNumber} ---\n${pageText}`);
    }

    return pages.join('\n');
}
