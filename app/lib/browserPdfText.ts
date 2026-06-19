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
