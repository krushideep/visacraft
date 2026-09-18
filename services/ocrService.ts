// Client-side OCR via tesseract.js, using self-hosted worker/core/lang-data assets
// (public/tesseract/) instead of the library's default CDN, so no request ever
// leaves the browser's origin — even on first use. See public/tesseract/README.md.

export interface OcrResult {
  text: string;
  confidence: number; // normalized 0-1 (tesseract reports 0-100)
}

// Unlike webllmService's memoized engine singleton, OCR workers are cheap and
// short-lived: we spin one up per verification and terminate it afterward
// rather than keeping a worker resident for the life of the app.
export const runOcr = async (image: File | Blob): Promise<OcrResult> => {
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker('eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/tesseract-core.wasm.js',
    langPath: '/tesseract/lang-data',
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
