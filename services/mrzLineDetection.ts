// Port of ~/hobby/aiExperiments/pyOcr/mrz_extract.py's image-processing
// pipeline (blackhat/gradient line-blob detection, ink-pixel crop
// refinement) using image-js — pure JavaScript, no WASM. An OpenCV.js-based
// version was tried first, but its official build's async WASM
// initialization was found to hang indefinitely in a Worker (and to freeze
// the page for minutes if run on the main thread), so it was abandoned in
// favor of this dependency, which is also what services/documentVerification-
// adjacent research this session already validated works reliably (used
// earlier for the mrz-detection package's own region-cropping approach).
//
// Simplification vs the Python original: deskew (Hough-line-based rotation
// correction) is not ported — image-js has no Hough transform, and
// reimplementing one was out of scope. Rotated photos rely on the ink-based
// crop refinement and the bottom-25% fallback for resilience instead.
//
// Only the image-processing layer is ported — that script's MRZ *parsing* is
// tuned to a specific non-standard synthetic dataset and is intentionally
// not reused; services/mrzService.ts already implements real ICAO 9303
// parsing/checksums.

import { Image } from 'image-js';

export interface MrzLineCrops {
  line1Blob: Blob;
  line2Blob: Blob;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const getRectKernel = (w: number, h: number): number[][] => {
  const kernel: number[][] = [];
  for (let i = 0; i < w; i++) kernel.push(new Array(h).fill(1));
  return kernel;
};

async function loadGrayImage(image: File | Blob): Promise<any> {
  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const rgba = Image.fromCanvas(canvas);
  return rgba.grey();
}

function findLineCandidates(gray: any, minAr = 4.0, minWRatio = 0.15): Box[] {
  const h = gray.height;
  const w = gray.width;
  const rectKernel = getRectKernel(25, 5);

  const blurred = gray.gaussianFilter({ radius: 1 });
  const blackhat = blurred.blackHat({ kernel: rectKernel });

  // ksize=-1 in the Python original selects the Scharr operator, which is
  // exactly what scharrFilter is — this is a direct, not approximate, port.
  let grad = blackhat.scharrFilter({ direction: 'x', bitDepth: 32 });
  grad = grad.abs();
  grad = grad.rgba8().grey();

  const closed = grad.close({ kernel: rectKernel });
  const thresh = closed.mask({ algorithm: 'otsu' });
  const eroded = thresh.erode({ iterations: 2 });

  const roiManager = eroded.getRoiManager();
  roiManager.fromMask(eroded);
  const rois = roiManager.getRois({ minSurface: 5000 });

  const boxes: Box[] = [];
  for (const roi of rois) {
    const rw = roi.maxX - roi.minX;
    const rh = roi.maxY - roi.minY;
    const ar = rw / (rh + 1e-6);
    if (ar > minAr && rw > minWRatio * w && rh > 0.004 * h && rh < 0.08 * h) {
      boxes.push({ x: roi.minX, y: roi.minY, w: rw, h: rh });
    }
  }

  boxes.sort((a, b) => a.y - b.y);
  return boxes;
}

function otsuInvMask(gray: any): any {
  return gray.mask({ algorithm: 'otsu', invert: true });
}

function rowHasInk(mask: any): boolean[] {
  const { width, height } = mask;
  const result: boolean[] = new Array(height).fill(false);
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (mask.getBitXY(c, r)) {
        result[r] = true;
        break;
      }
    }
  }
  return result;
}

function colHasInk(mask: any): boolean[] {
  const { width, height } = mask;
  const result: boolean[] = new Array(width).fill(false);
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height; r++) {
      if (mask.getBitXY(c, r)) {
        result[c] = true;
        break;
      }
    }
  }
  return result;
}

const clampCrop = (gray: any, x: number, y: number, w: number, h: number): any => {
  const x0 = Math.max(0, Math.min(x, gray.width - 1));
  const y0 = Math.max(0, Math.min(y, gray.height - 1));
  const cw = Math.max(1, Math.min(w, gray.width - x0));
  const ch = Math.max(1, Math.min(h, gray.height - y0));
  return gray.crop({ x: x0, y: y0, width: cw, height: ch });
};

// The two real MRZ lines are always nearly identical width and tightly
// stacked (small vertical gap relative to line height), since they're two
// 44-char monospace lines from the same block. Unrelated text elsewhere in
// the frame (e.g. a back-page address/file-number line on a photo that
// happens to include more than just the bio page) can also pass the
// single-box aspect-ratio filter in findLineCandidates, so — rather than
// assuming the bottommost two candidates are automatically the MRZ, which
// picks the wrong block on multi-page-composite photos — score every
// adjacent pair by width/height similarity and gap tightness and take the
// best-matching pair, wherever it sits in the frame.
function selectBestPair(boxes: Box[]): [Box, Box] | null {
  let best: [Box, Box] | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < boxes.length - 1; i++) {
    const a = boxes[i];
    const b = boxes[i + 1];
    const gap = b.y - (a.y + a.h);
    if (gap < 0) continue; // overlapping boxes can't be the two MRZ lines
    const widthRatio = Math.min(a.w, b.w) / Math.max(a.w, b.w);
    const heightRatio = Math.min(a.h, b.h) / Math.max(a.h, b.h);
    const avgH = (a.h + b.h) / 2;
    const gapRatio = gap / avgH;
    const score = widthRatio * 3 + heightRatio - gapRatio * 2 + Math.min(a.w, b.w) * 0.001;
    if (score > bestScore) {
      bestScore = score;
      best = [a, b];
    }
  }
  return best;
}

// Port of locate_mrz_lines: detect MRZ text-line blobs (at a fixed detection
// width so morphology kernel sizes behave consistently regardless of source
// resolution), pick the best-matching adjacent pair (see selectBestPair),
// refine each crop using actual ink-pixel row/column analysis (not just the
// morphology bounding box), and fall back to the bottom 25% of the page
// split in half when fewer than two candidates are found or no pair scores
// well, so this always returns two crops to attempt OCR on.
function locateMrzLines(gray: any, detectWidth = 1600): { line1: any; line2: any } {
  const h = gray.height;
  const w = gray.width;
  const scale = detectWidth / Math.max(w, 1);

  const detectImg = gray.resize({ width: Math.round(w * scale) });
  const boxes = findLineCandidates(detectImg);
  const pair = boxes.length >= 2 ? selectBestPair(boxes) : null;

  if (!pair) {
    const bandY0 = Math.floor(h * 0.75);
    const bandH = h - bandY0;
    const half = Math.floor(bandH / 2);
    return {
      line1: clampCrop(gray, 0, bandY0, w, half),
      line2: clampCrop(gray, 0, bandY0 + half, w, bandH - half),
    };
  }

  const [b1, b2] = pair;
  const lineGap = Math.round((b2.y - (b1.y + b1.h)) / scale);

  const crops: any[] = [];
  for (const box of [b1, b2]) {
    const x = Math.round(box.x / scale);
    const y = Math.round(box.y / scale);
    const cw = Math.round(box.w / scale);
    const ch = Math.round(box.h / scale);

    let padY = Math.round(ch * 0.7);
    if (lineGap > 0) padY = Math.min(padY, Math.round(lineGap * 0.45));
    let y0 = Math.max(0, y - padY);
    let y1 = Math.min(h, y + ch + padY);

    if (y1 - y0 > ch * 3.0) {
      const probe = otsuInvMask(clampCrop(gray, x, y0, cw, y1 - y0));
      const rowInk = rowHasInk(probe);

      const runs: [number, number][] = [];
      let runStart: number | null = null;
      for (let i = 0; i < rowInk.length; i++) {
        if (rowInk[i] && runStart === null) runStart = i;
        else if (!rowInk[i] && runStart !== null) {
          runs.push([runStart, i]);
          runStart = null;
        }
      }
      if (runStart !== null) runs.push([runStart, rowInk.length]);

      if (runs.length > 0) {
        let best = runs[0];
        for (const r of runs) if (r[1] - r[0] > best[1] - best[0]) best = r;
        const linePad = Math.max(2, Math.round((best[1] - best[0]) * 0.35));
        const baseY0 = y0;
        y0 = baseY0 + Math.max(0, best[0] - linePad);
        y1 = baseY0 + Math.min(rowInk.length, best[1] + linePad);
      }
    }

    const searchPad = Math.round(w * 0.15);
    const sx0 = Math.max(0, x - searchPad);
    const sx1 = Math.min(w, x + cw + searchPad);
    const inkMask = otsuInvMask(clampCrop(gray, sx0, y0, sx1 - sx0, y1 - y0));
    const colInk = colHasInk(inkMask);

    let x0: number;
    let x1: number;
    const firstInkCol = colInk.indexOf(true);
    const lastInkCol = colInk.lastIndexOf(true);
    if (firstInkCol >= 0) {
      x0 = sx0 + firstInkCol;
      x1 = sx0 + lastInkCol + 1;
    } else {
      x0 = x;
      x1 = x + cw;
    }

    const padX = Math.round(w * 0.01);
    x0 = Math.max(0, x0 - padX);
    x1 = Math.min(w, x1 + padX);

    crops.push(clampCrop(gray, x0, y0, x1 - x0, y1 - y0));
  }

  return { line1: crops[0], line2: crops[1] };
}

function preprocessLineForOcr(lineImg: any): any {
  const resized = lineImg.resize({ width: lineImg.width * 3, height: lineImg.height * 3 });
  const blurred = resized.gaussianFilter({ radius: 1 });
  return blurred.mask({ algorithm: 'otsu' });
}

function toBlob(img: any): Promise<Blob> {
  const canvas = img.getCanvas();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob: Blob | null) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob failed'));
    }, 'image/png');
  });
}

export const detectMrzLines = async (image: File | Blob): Promise<MrzLineCrops> => {
  const gray = await loadGrayImage(image);
  const { line1, line2 } = locateMrzLines(gray);
  const processed1 = preprocessLineForOcr(line1);
  const processed2 = preprocessLineForOcr(line2);
  const [line1Blob, line2Blob] = await Promise.all([toBlob(processed1), toBlob(processed2)]);
  return { line1Blob, line2Blob };
};
