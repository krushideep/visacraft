// Converts a PDF's first page to an image, entirely client-side (via
// self-hosted PDF.js — see public/pdfjs/README.md), so PDF uploads can be
// fed through the existing image-based OCR pipeline (services/ocrService.ts,
// services/mrzLineDetection.ts) unchanged. Only the first page is rendered —
// document verification is scoped to a single bio page / statement page,
// not multi-page documents.

const assetUrl = (relativePath: string) => new URL(relativePath, document.baseURI).toString();

let workerConfigured = false;

const configureWorker = async () => {
  if (workerConfigured) return;
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = assetUrl('pdfjs/pdf.worker.min.mjs');
  workerConfigured = true;
};

export const isPdf = (file: File | Blob): boolean =>
  file.type === 'application/pdf' || (file instanceof File && file.name.toLowerCase().endsWith('.pdf'));

export const pdfFirstPageToImageBlob = async (file: File | Blob): Promise<Blob> => {
  await configureWorker();
  const pdfjs = await import('pdfjs-dist');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  // Scale up for OCR legibility — PDFs are often authored at a low default
  // DPI that's fine for on-screen viewing but too soft for character
  // recognition once cropped down to a single MRZ line.
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  await pdf.cleanup();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to convert PDF page to image'));
    }, 'image/png');
  });
};
