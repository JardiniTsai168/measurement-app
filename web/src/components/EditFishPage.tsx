import { useState, useRef, useEffect, useCallback } from 'react';
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
import type { Point, Rect } from '../types';
import { calculatePixelsPerCm, calculateFishLength } from '../utils/cv';

interface Props {
  imageDataUrl: string;
  cardRect: Rect;
  onConfirm: (head: Point, tail: Point, lenCm: number) => void;
  onBack: () => void;
}

export default function EditFishPage({ imageDataUrl, cardRect, onConfirm, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [head, setHead] = useState<Point | null>(null);
  const [tail, setTail] = useState<Point | null>(null);
  const [mode, setMode] = useState<'head' | 'tail'>('head');

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current;
      const cont = containerRef.current;
      if (!c || !cont) return;
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
      setContainerSize({ w, h });
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  // Redraw markers
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Redraw image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, c.width, c.height);
      // Draw measurement line if both points exist
      if (head && tail) {
        ctx.beginPath();
        ctx.moveTo(head.x, head.y);
        ctx.lineTo(tail.x, tail.y);
        ctx.strokeStyle = '#1A1A5E';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw head marker
        ctx.fillStyle = '#FF6B9D';
        ctx.beginPath();
        ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw tail marker
        ctx.fillStyle = '#1A1A5E';
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (head) {
        ctx.fillStyle = '#FF6B9D';
        ctx.beginPath();
        ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (tail) {
        ctx.fillStyle = '#1A1A5E';
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };
    img.src = imageDataUrl;
  }, [head, tail, imageDataUrl]);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const cont = containerRef.current;
    const c = canvasRef.current;
    if (!cont || !c) return;
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const r = cont.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;

    if (mode === 'head') {
      setHead({ x, y });
      setMode('tail');
    } else {
      setTail({ x, y });
    }
  }, [mode]);

  const handleConfirm = useCallback(() => {
    if (!head || !tail) return;
    // Points are already in canvas coords which match image scaled
    const img = new Image();
    img.onload = () => {
      const scaleX = img.width / containerSize.w;
      const scaleY = img.height / containerSize.h;
      // Actually we should calculate using original scale, but the pixelsPerCm was computed from original cardRect
      // So we need to convert points back to original image coordinates or use scale
      const headOrig = { x: head.x * scaleX, y: head.y * scaleY };
      const tailOrig = { x: tail.x * scaleX, y: tail.y * scaleY };
      const ppc = calculatePixelsPerCm(cardRect);
      const len = calculateFishLength(headOrig, tailOrig, ppc);
      onConfirm(headOrig, tailOrig, len);
    };
    img.src = imageDataUrl;
  }, [head, tail, cardRect, containerSize, onConfirm, imageDataUrl]);

  return (
    <div className="flex flex-col min-h-dvh bg-dark text-white">
      <div className="p-4 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:scale-90 transition-transform">
          <FaArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">
            {mode === 'head' ? '標記魚頭' : '標記尾鳍'}
          </h2>
          <p className="text-xs text-white/50">
            {mode === 'head'
              ? '點擊魚頭最前端位置'
              : '點擊尾鳍末端位置'}
          </p>
        </div>
        {head && tail && (
          <button
            onClick={handleConfirm}
            className="bg-primary text-white px-4 py-2 rounded-xl font-semibold active:scale-95 transition-transform flex items-center gap-2 text-sm"
          >
            <FaCheck size={14} /> 完成
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center px-4 relative"
        onClick={handleTap}
        onTouchStart={handleTap}
      >
        <canvas ref={canvasRef} className="rounded-lg" />

        {mode === 'head' && !head && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-primary/90 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg animate-pulse">
              點擊魚頭前端
            </div>
          </div>
        )}
        {mode === 'tail' && !tail && head && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-dark/80 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg animate-pulse">
              點擊尾鳍末端
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-8">
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => { setHead(null); setTail(null); setMode('head'); }}
            className="text-sm text-white/60 underline"
          >
            重新標記
          </button>
        </div>
        <div className="flex gap-3">
          <div className={`flex-1 h-1 rounded-full ${mode === 'head' ? 'bg-primary' : 'bg-white/20'}`} />
          <div className={`flex-1 h-1 rounded-full ${mode === 'tail' ? 'bg-primary' : 'bg-white/20'}`} />
        </div>
      </div>
    </div>
  );
}
