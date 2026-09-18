# Self-hosted PDF.js worker

`pdf.worker.min.mjs` is copied from `node_modules/pdfjs-dist/build/` (Mozilla's
PDF.js, Apache-2.0) instead of letting `pdfjs-dist` fetch it from a CDN at
runtime, for the same "nothing leaves the browser" reason documented in
`public/tesseract/README.md` — document verification (`services/pdfService.ts`)
converts a PDF's first page to an image entirely client-side, and the
worker script itself must be same-origin for that to hold.

Used by `services/pdfService.ts`, which sets
`GlobalWorkerOptions.workerSrc` to this file's URL (resolved against
`document.baseURI`, same pattern as the tesseract/opencv asset loaders).

To refresh after bumping the `pdfjs-dist` version:

```
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdfjs/pdf.worker.min.mjs
```
