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

const MRZ_CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';

const normalizeToTd3Length = (s: string) => {
  const cleaned = s.replace(/[^A-Z0-9<]/gi, '').toUpperCase();
  return cleaned.length >= 44 ? cleaned.slice(0, 44) : cleaned.padEnd(44, '<');
};

export interface MrzLineOcrResult {
  line1: string;
  line2: string;
  confidence: number;
}

// Isolates each MRZ line individually — morphology-based line detection,
// ink-pixel crop refinement (services/mrzLineDetection.ts, using image-js —
// pure JS, no WASM) — then OCRs each line separately with a single-line page
// segmentation mode and a character whitelist, rather than OCR'ing the whole
// image at once the way runOcr() does. This is a meaningfully more accurate
// (but heavier) path specifically for reading the MRZ; non-passport
// documents don't use this.
export const runMrzLineOcr = async (image: File | Blob): Promise<MrzLineOcrResult | null> => {
  const { detectMrzLines } = await import('./mrzLineDetection');
  const { createWorker, PSM } = await import('tesseract.js');

  const { line1Blob, line2Blob } = await detectMrzLines(image);

  const worker = await createWorker('ocrb', 1, {
    workerPath: assetUrl('tesseract/worker.min.js'),
    corePath: assetUrl('tesseract/tesseract-core.wasm.js'),
    langPath: assetUrl('tesseract/lang-data'),
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      tessedit_char_whitelist: MRZ_CHAR_WHITELIST,
    });

    const [res1, res2] = await Promise.all([worker.recognize(line1Blob), worker.recognize(line2Blob)]);
    const line1 = normalizeToTd3Length(res1.data.text ?? '');
    const line2 = normalizeToTd3Length(res2.data.text ?? '');
    const confidence = Math.max(0, Math.min(1, ((res1.data.confidence ?? 0) + (res2.data.confidence ?? 0)) / 200));

    return { line1, line2, confidence };
  } finally {
    await worker.terminate();
  }
};
