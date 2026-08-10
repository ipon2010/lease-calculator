import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker import.
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts raw text from every page of a PDF file, client-side, before any
 * network call is made. This is the only step that touches the raw document —
 * the extracted text is what gets sent to the AI extraction endpoint.
 */
export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ");
    pageTexts.push(text);
  }

  return pageTexts.join("\n\n---PAGE BREAK---\n\n");
}
