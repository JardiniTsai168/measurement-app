import { useState, useRef, useEffect, useCallback } from 'react';
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
import type { Point, Rect } from '../types';
import { calculatePixelsPerCm, calculateLengthCm, calculateWidthCm } from '../utils/cv';

interface Props {
  imageDataUrl: string;
  cardRect: Rect;
  onConfirm: (lengthStart: Point, lengthEnd: Point, widthStart: Point | null, widthEnd: Point | null, lengthCm: number, widthCm: number | null) => void;
  onBack: () => void;
}

type Step = 'length-start' | 'length-end' | 'width-start' | 'width-end';
const STEP_LABELS: Record<Step, { title: string; subtitle: string }> = {
  'length-start': { title: '標記長度起點', subtitle: '點擊物體最長邊的起點' },
  'length-end': { title: '標記長度終點', subtitle: '點擊物體最長邊的終點' },
  'width-start': { title: '標記寬度起點', subtitle: '點擊物體最寬邊的起點' },
  'width-end': { title: '標記寬度終點', subtitle: '點擊物體最寬邊的終點' },
};

export default function EditObjectPage({ imageDataUrl, cardRect, onConfirm, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [lengthStart, setLengthStart] = useState<Point | null>(null);
  const [lengthEnd, setLengthEnd] = useState<Point | null>(null);
  const [widthStart, setWidthStart] = useState<Point | null>(null);
  const [widthEnd, setWidthEnd] = useState<Point | null>(null);
  const [step, setStep] = useState<Step>('length-start');

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

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, c.width, c.height);

      // Draw length line
      if (lengthStart && lengthEnd) {
        ctx.beginPath();
        ctx.moveTo(lengthStart.x, lengthStart.y);
        ctx.lineTo(lengthEnd.x, lengthEnd.y);
        ctx.strokeStyle = '#FF6B9D';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#FF6B9D';
        ctx.beginPath();
        ctx.arc(lengthStart.x, lengthStart.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#FF6B9D';
        ctx.beginPath();
        ctx.arc(lengthEnd.x, lengthEnd.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (lengthStart) {
        ctx.fillStyle = '#FF6B9D';
        ctx.beginPath();
        ctx.arc(lengthStart.x, lengthStart.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw width line
      if (widthStart && widthEnd) {
        ctx.beginPath();
        ctx.moveTo(widthStart.x, widthStart.y);
        ctx.lineTo(widthEnd.x, widthEnd.y);
        ctx.strokeStyle = '#1A1A5E';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#1A1A5E';
        ctx.beginPath();
        ctx.arc(widthStart.x, widthStart.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#1A1A5E';
        ctx.beginPath();
        ctx.arc(widthEnd.x, widthEnd.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (widthStart) {
        ctx.fillStyle = '#1A1A5E';
        ctx.beginPath();
        ctx.arc(widthStart.x, widthStart.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };
    img.src = imageDataUrl;
  }, [lengthStart, lengthEnd, widthStart, widthEnd, imageDataUrl]);

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

    if (step === 'length-start') {
      setLengthStart({ x, y });
      setStep('length-end');
    } else if (step === 'length-end') {
      setLengthEnd({ x, y });
      setStep('width-start');
    } else if (step === 'width-start') {
      setWidthStart({ x, y });
      setStep('width-end');
    } else if (step === 'width-end') {
      setWidthEnd({ x, y });
    }
  }, [step]);

  const handleConfirm = useCallback(() => {
    if (!lengthStart || !lengthEnd) return;
    const img = new Image();
    img.onload = () => {
      const scaleX = img.width / containerSize.w;
      const scaleY = img.height / containerSize.h;
      const lengthStartOrig = { x: lengthStart.x * scaleX, y: lengthStart.y * scaleY };
      const lengthEndOrig = { x: lengthEnd.x * scaleX, y: lengthEnd.y * scaleY };
      const widthStartOrig = widthStart ? { x: widthStart.x * scaleX, y: widthStart.y * scaleY } : null;
      const widthEndOrig = widthEnd ? { x: widthEnd.x * scaleX, y: widthEnd.y * scaleY } : null;
      const ppc = calculatePixelsPerCm(cardRect);
      const len = calculateLengthCm(lengthStartOrig, lengthEndOrig, ppc);
      let wid: number | null = null;
      if (widthStartOrig && widthEndOrig) {
        wid = calculateWidthCm(widthStartOrig, widthEndOrig, ppc);
      }
      onConfirm(lengthStartOrig, lengthEndOrig, widthStartOrig, widthEndOrig, len, wid);
    };
    img.src = imageDataUrl;
  }, [lengthStart, lengthEnd, widthStart, widthEnd, cardRect, containerSize, onConfirm, imageDataUrl]);

  const handleReset = useCallback(() => {
    setLengthStart(null);
    setLengthEnd(null);
    setWidthStart(null);
    setWidthEnd(null);
    setStep('length-start');
  }, []);

  const handleSkipWidth = useCallback(() => {
    setStep('width-end');
  }, []);

  const currentLabel = STEP_LABELS[step];
  const canConfirm = !!lengthStart && !!lengthEnd;
  const steps = ['length-start', 'length-end', 'width-start', 'width-end'] as Step[];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="flex flex-col min-h-dvh bg-dark text-white">
      <div className="p-4 flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 active:scale-90 transition-transform">
          <FaArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{currentLabel.title}</h2>
          <p className="text-xs text-white/50">{currentLabel.subtitle}</p>
        </div>
        {canConfirm && (
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

        {!lengthStart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-primary/90 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg animate-pulse">
              點擊物體長度起點
            </div>
          </div>
        )}
        {step === 'length-end' && !lengthEnd && lengthStart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-dark/80 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg animate-pulse">
              點擊物體長度終點
            </div>
          </div>
        )}
        {step === 'width-start' && !widthStart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-dark/80 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg animate-pulse">
              點擊物體寬度起點
            </div>
          </div>
        )}
        {step === 'width-end' && !widthEnd && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-dark/80 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-lg animate-pulse">
              點擊物體寬度終點（或按完成跳過）
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pb-8">
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={handleReset}
            className="text-sm text-white/60 underline"
          >
            重新標記
          </button>
          {step === 'width-start' && (
            <button
              onClick={handleSkipWidth}
              className="text-sm text-white/60 underline"
            >
              跳過寬度
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${i <= stepIndex ? 'bg-primary' : 'bg-white/20'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
