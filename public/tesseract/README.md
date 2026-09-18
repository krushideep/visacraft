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

## Language models

Two trained-data files are hosted under `lang-data/`, used for different jobs:

- **`eng.traineddata.gz`** — general print recognition, used for every
  document category. Sourced from the official
  [`tesseract-ocr/tessdata_best`](https://github.com/tesseract-ocr/tessdata_best)
  repo (Apache-2.0), gzipped locally since `tessdata_best` ships uncompressed
  `.traineddata` files:
  ```
  curl -L -o eng.traineddata https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/eng.traineddata
  gzip -9 eng.traineddata && mv eng.traineddata.gz lang-data/eng.traineddata.gz
  ```

- **`ocrb.traineddata.gz`** — a model trained specifically on the OCR-B font
  used by a passport's machine-readable zone (MRZ), which the general `eng`
  model isn't tuned to read accurately. Used only for the passport category
  (see `components/DocumentVerificationPanel.tsx`'s dual-pass logic in
  `handleFileChange`, which runs both models in parallel and picks whichever
  produces a checksum-computable MRZ result). Sourced from
  [`DaanVanVugt/tesseract-mrz`](https://github.com/DaanVanVugt/tesseract-mrz):
  ```
  curl -L -o lang-data/ocrb.traineddata.gz https://raw.githubusercontent.com/DaanVanVugt/tesseract-mrz/master/lang/OCRB.traineddata.gz
  ```
  **License note:** that source repo is GPLv3-licensed (see
  `lang-data/OCRB-LICENSE.txt`, copied verbatim from the repo). This trained-data
  file is kept as a separate, clearly-attributed runtime asset — inert model
  weights loaded by tesseract.js at runtime, not linked into or compiled with
  this project's application code — but the copyleft terms of that upstream
  repo still apply to the asset itself. Keep this attribution file alongside
  it if the model is ever updated or redistributed.
