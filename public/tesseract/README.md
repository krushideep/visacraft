# Self-hosted tesseract.js assets

These files (`worker.min.js`, `tesseract-core.wasm.js`, `tesseract-core.wasm`,
`lang-data/eng.traineddata.gz`) are copied from `node_modules/tesseract.js`
and `node_modules/tesseract.js-core` at their pinned versions, plus the
English "fast" trained-data model, instead of letting tesseract.js fetch them
from its default jsDelivr CDN at runtime.

Reason: document verification (`services/ocrService.ts`) is a
nothing-leaves-the-browser feature. If the worker/core/lang files were
fetched from a third-party CDN on first use, that would be a real network
request made while processing a user's uploaded document, even though the
document image itself never leaves the browser. Self-hosting removes that
ambiguity entirely — verify with the Network tab that a full OCR run makes
only same-origin `/tesseract/*` requests.

To refresh after bumping the `tesseract.js` version:

```
cp node_modules/tesseract.js/dist/worker.min.js public/tesseract/worker.min.js
cp node_modules/tesseract.js-core/tesseract-core.wasm.js public/tesseract/tesseract-core.wasm.js
cp node_modules/tesseract.js-core/tesseract-core.wasm public/tesseract/tesseract-core.wasm
```

The trained-data file rarely needs updating; it was fetched once from
`https://github.com/naptha/tessdata/raw/gh-pages/4.0.0_fast/eng.traineddata.gz`.
