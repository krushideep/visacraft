// Client-side OCR via tesseract.js, using self-hosted worker/core/lang-data assets
// (public/tesseract/) instead of the library's default CDN, so no request ever
// leaves the browser's origin — even on first use. See public/tesseract/README.md.

export interface OcrResult {
  text: string;
  confidence: number; // normalized 0-1 (tesseract reports 0-100)
}

// The worker/core/lang paths must be resolved to absolute URLs, not paths
// relative to the page: createWorker loads them via importScripts() inside a
// blob: worker context, which cannot resolve a root-relative "/tesseract/..."
// path against the app's deployed base (e.g. GitHub Pages serves this app
// under "/visacraft/", not the domain root). document.baseURI reflects the
// actual deployed base regardless of how Vite's `base` config is set.
const assetUrl = (relativePath: string) => new URL(relativePath, document.baseURI).toString();

// 'eng' (tessdata_best, Apache-2.0) reads normal print; 'ocrb' is a dedicated
// model trained on the OCR-B font used by the MRZ, which a general print
// model isn't tuned to recognize accurately. See public/tesseract/README.md
// for provenance and licensing (the ocrb model is GPLv3, kept as a separate
// attributed data asset rather than linked into application code).
export type OcrLang = 'eng' | 'ocrb';

// Unlike webllmService's memoized engine singleton, OCR workers are cheap and
// short-lived: we spin one up per verification and terminate it afterward
// rather than keeping a worker resident for the life of the app.
export const runOcr = async (image: File | Blob, lang: OcrLang = 'eng'): Promise<OcrResult> => {
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker(lang, 1, {
    workerPath: assetUrl('tesseract/worker.min.js'),
    corePath: assetUrl('tesseract/tesseract-core.wasm.js'),
    langPath: assetUrl('tesseract/lang-data'),
  });

  try {
    const { data } = await worker.recognize(image);
    return {
      text: data.text ?? '',
      confidence: Math.max(0, Math.min(1, (data.confidence ?? 0) / 100)),
    };
  } finally {
    await worker.terminate();
  }
};

// No-op kept for API symmetry with the plan/callers that expect explicit
// cleanup after a verification flow completes or unmounts; runOcr already
// terminates its own worker, so this exists only if a caller wants to be
// defensive without knowing that detail.
export const terminateOcr = async () => {};
