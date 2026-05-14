import type { Rect, Point } from '../types';

const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 54.0;

export function isCvReady(): boolean {
  return typeof window !== 'undefined' && !!window.cv && !!window.cv.Mat;
}

export function waitForCv(timeout = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isCvReady()) { resolve(); return; }
    const start = Date.now();
    const t = setInterval(() => {
      if (isCvReady()) { clearInterval(t); resolve(); }
      else if (Date.now() - start > timeout) { clearInterval(t); reject(new Error('OpenCV init timeout')); }
    }, 200);
  });
}

function detectCardWithCv(canvas: HTMLCanvasElement): Rect | null {
  const cv = window.cv;
  try {
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const blur = new cv.Mat();
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
    const edges = new cv.Mat();
    cv.Canny(blur, edges, 50, 150);
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let best: Rect | null = null;
    let bestScore = 0;
    const cw = canvas.width;
    const ch = canvas.height;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      if (peri < 100) continue;
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      if (approx.rows === 4) {
        const r = cv.boundingRect(approx);
        const aspect = Math.max(r.width, r.height) / Math.min(r.width, r.height);
        const cardAspect = CARD_WIDTH_MM / CARD_HEIGHT_MM; // ~1.585
        const aspectError = Math.abs(aspect - cardAspect) / cardAspect;
        const areaRatio = (r.width * r.height) / (cw * ch);
        if (aspectError < 0.35 && areaRatio > 0.01 && areaRatio < 0.8) {
          const area = cv.contourArea(cnt);
          const bboxArea = r.width * r.height;
          const fullness = area / bboxArea;
          const score = fullness * (1 - aspectError) * Math.min(areaRatio * 20, 1);
          if (score > bestScore) {
            bestScore = score;
            best = { x: r.x, y: r.y, w: r.width, h: r.height };
          }
        }
        approx.delete();
      }
    }

    src.delete(); gray.delete(); blur.delete(); edges.delete();
    contours.delete(); hierarchy.delete();
    return best;
  } catch (e) {
    console.warn('CV detect failed', e);
    return null;
  }
}

function simpleEdgeDetect(canvas: HTMLCanvasElement): Rect | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  // Simple Sobel + threshold to find edges, then find largest rectangle-ish contour
  // For MVP, we'll just use a simplified approach: find regions with high edge density
  // that have roughly card aspect ratio. This is much lighter than full CV.
  
  // Downsample for speed
  const step = 4;
  const sw = Math.floor(w / step);
  const sh = Math.floor(h / step);
  const edgeMap = new Float32Array(sw * sh);

  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const px = x * step;
      const py = y * step;
      const idx = (py * w + px) * 4;
      const gy = Math.abs(d[idx] - d[((py + step) * w + px) * 4]);
      const gx = Math.abs(d[idx] - d[(py * w + px + step) * 4]);
      edgeMap[y * sw + x] = gx + gy;
    }
  }

  // Find bounding box of high-edge region with ~1.58 aspect
  const threshold = 60;
  let best: Rect | null = null;
  let bestScore = 0;

  // Sliding window search for rectangles
  for (let y = 0; y < sh; y += 2) {
    for (let x = 0; x < sw; x += 2) {
      for (let eh = 8; eh < sh - y; eh += 4) {
        const ew = Math.round(eh * 1.585);
        if (x + ew >= sw) break;
        let edgeCount = 0;
        let total = 0;
        for (let yy = y; yy < y + eh; yy += 2) {
          for (let xx = x; xx < x + ew; xx += 2) {
            total++;
            if (edgeMap[yy * sw + xx] > threshold) edgeCount++;
          }
        }
        if (total === 0) continue;
        const density = edgeCount / total;
        const areaRatio = (ew * eh * step * step) / (w * h);
        if (density > 0.15 && areaRatio > 0.02 && areaRatio < 0.6) {
          const score = density * areaRatio;
          if (score > bestScore) {
            bestScore = score;
            best = { x: x * step, y: y * step, w: ew * step, h: eh * step };
          }
        }
      }
    }
  }

  return best;
}

export async function autoDetectCard(canvas: HTMLCanvasElement): Promise<Rect | null> {
  if (isCvReady()) {
    try { return detectCardWithCv(canvas); } catch {}
  }
  return simpleEdgeDetect(canvas);
}

export function calculatePixelsPerCm(cardRect: Rect): number {
  // Use the longer side (width usually) for scale
  const pxWidth = cardRect.w;
  const cmWidth = CARD_WIDTH_MM / 10;
  return pxWidth / cmWidth;
}

export function calculateFishLength(
  head: Point,
  tail: Point,
  pixelsPerCm: number,
  imageScale = 1
): number {
  const dx = (head.x - tail.x) * imageScale;
  const dy = (head.y - tail.y) * imageScale;
  const pxLen = Math.sqrt(dx * dx + dy * dy);
  return pxLen / pixelsPerCm;
}
