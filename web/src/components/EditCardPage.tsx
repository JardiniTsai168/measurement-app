import { useState, useRef, useEffect, useCallback } from 'react';
import { FaArrowLeft, FaRedo, FaCheck, FaLightbulb } from 'react-icons/fa';
import type { Rect } from '../types';
import { autoDetectCard, isCvReady, waitForCv } from '../utils/cv';

interface Props {
  imageDataUrl: string;
  onConfirm: (rect: Rect) => void;
  onBack: () => void;
}

export default function EditCardPage({ imageDataUrl, onConfirm, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; rect: Rect } | null>(null);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [_cvStatus, setCvStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  // Load image and detect card
  useEffect(() => {
    const img = new Image();
    img.onload = async () => {
      const c = canvasRef.current;
      const cont = containerRef.current;
      if (!c || !cont) return;

      // Fit to container while keeping aspect ratio
      const maxW = cont.clientWidth;
      const maxH = window.innerHeight * 0.6;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      c.width = w;
      c.height = h;
      c.style.width = w + 'px';
      c.style.height = h + 'px';

      const ctx = c.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, w, h);

      setImgSize({ w: img.width, h: img.height });
      setContainerSize({ w, h });

      // Try auto detect
      setAutoDetecting(true);
      setCvStatus('loading');
      try {
        if (!isCvReady()) await waitForCv(5000).catch(() => {});
        setCvStatus(isCvReady() ? 'ready' : 'failed');
        const detected = await autoDetectCard(c);
        if (detected) {
          setRect(detected);
        } else {
          // Default center position ~ 1/3 of image
          const cw = w * 0.35;
          const ch = cw / 1.585;
          setRect({ x: w * 0.325, y: h * 0.4 - ch / 2, w: cw, h: ch });
        }
      } catch {
        setCvStatus('failed');
      } finally {
        setAutoDetecting(false);
      }
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  const getPointerPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const cont = containerRef.current;
    if (!cont) return { x: 0, y: 0 };
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const r = cont.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }, []);

  const handleDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPointerPos(e);
    const margin = 20;
    let mode: typeof dragging = null;

    if (Math.abs(pos.x - rect.x) < margin && Math.abs(pos.y - rect.y) < margin) mode = 'nw';
    else if (Math.abs(pos.x - (rect.x + rect.w)) < margin && Math.abs(pos.y - rect.y) < margin) mode = 'ne';
    else if (Math.abs(pos.x - rect.x) < margin && Math.abs(pos.y - (rect.y + rect.h)) < margin) mode = 'sw';
    else if (Math.abs(pos.x - (rect.x + rect.w)) < margin && Math.abs(pos.y - (rect.y + rect.h)) < margin) mode = 'se';
    else if (pos.x >= rect.x && pos.x <= rect.x + rect.w && pos.y >= rect.y && pos.y <= rect.y + rect.h) mode = 'move';
    else {
      // Create new rect centered on click
      const cw = containerSize.w * 0.25;
      const ch = cw / 1.585;
      setRect({ x: pos.x - cw / 2, y: pos.y - ch / 2, w: cw, h: ch });
      mode = 'move';
    }

    setDragging(mode);
    setTouchStart({ x: pos.x, y: pos.y, rect: { ...rect } });
  }, [rect, getPointerPos, containerSize]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging || !touchStart) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    const dx = pos.x - touchStart.x;
    const dy = pos.y - touchStart.y;
    const r = touchStart.rect;
    const maxW = containerSize.w;
    const maxH = containerSize.h;

    let nx = r.x, ny = r.y, nw = r.w, nh = r.h;
    if (dragging === 'move') {
      nx = Math.max(0, Math.min(maxW - r.w, r.x + dx));
      ny = Math.max(0, Math.min(maxH - r.h, r.y + dy));
    } else if (dragging === 'nw') {
      nx = Math.min(r.x + dx, r.x + r.w - 30);
      ny = Math.min(r.y + dy, r.y + r.h - 19);
      nw = r.w + r.x - nx;
      nh = nw / 1.585;
    } else if (dragging === 'ne') {
      nw = Math.max(30, Math.min(maxW - r.x, r.w + dx));
      nh = nw / 1.585;
      ny = r.y + r.h - nh;
    } else if (dragging === 'sw') {
      nx = Math.min(r.x + dx, r.x + r.w - 30);
      nw = r.w + r.x - nx;
      nh = nw / 1.585;
    } else if (dragging === 'se') {
      nw = Math.max(30, Math.min(maxW - r.x, r.w + dx));
      nh = nw / 1.585;
    }

    // Clamp
    if (nx < 0) nx = 0;
    if (ny < 0) ny = 0;
    if (nx + nw > maxW) nw = maxW - nx;
    if (ny + nh > maxH) nh = maxH - ny;
    if (nw < 30) nw = 30;
    if (nh < 19) nh = 19;

    setRect({ x: nx, y: ny, w: nw, h: nh });
  }, [dragging, touchStart, getPointerPos, containerSize]);

  const handleUp = useCallback(() => {
    setDragging(null);
    setTouchStart(null);
  }, []);

  const handleConfirm = useCallback(() => {
    // Map to original image scale
    if (containerSize.w === 0 || imgSize.w === 0) return;
    const scale = imgSize.w / containerSize.w;
    onConfirm({
      x: rect.x * scale,
      y: rect.y * scale,
      w: rect.w * scale,
      h: rect.h * scale,
    });
  }, [rect, imgSize, containerSize, onConfirm]);

  const retryAutoDetect = useCallback(async () => {
    const c = canvasRef.current;
    if (!c) return;
    setAutoDetecting(true);
    try {
      const detected = await autoDetectCard(c);
      if (detected) setRect(detected);
    } finally {
      setAutoDetecting(false);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-dark text-white">
      <div className="p-4 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:scale-90 transition-transform">
          <FaArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">調整信用卡位置</h2>
          <p className="text-xs text-white/50">拖動框選或放大縮小以套住信用卡</p>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center px-4 relative overflow-hidden"
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchStart={handleDown}
        onTouchMove={handleMove}
        onTouchEnd={handleUp}
      >
        <canvas ref={canvasRef} className="rounded-lg" style={{ touchAction: 'none' }} />

        {rect.w > 0 && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/10 rounded pointer-events-none"
            style={{
              left: rect.x + 'px',
              top: rect.y + 'px',
              width: rect.w + 'px',
              height: rect.h + 'px',
            }}
          >
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow" />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow" />
          </div>
        )}

        {autoDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="bg-dark px-4 py-2 rounded-xl text-sm flex items-center gap-2">
              <FaRedo className="animate-spin" /> 偵測中...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-8 space-y-3">
        <div className="flex items-start gap-2 bg-white/10 rounded-lg p-3">
          <FaLightbulb className="text-primary mt-0.5 shrink-0" size={14} />
          <p className="text-xs text-white/70 leading-relaxed">
            請確保信用卡跟物體在同一平面，相機盡量垂直拍攝。拖動邊界上的小圓點可以放大或縮小。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={retryAutoDetect}
            className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <FaRedo size={14} /> 重新偵測
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] bg-primary text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <FaCheck size={16} /> 確認位置
          </button>
        </div>
      </div>
    </div>
  );
}
