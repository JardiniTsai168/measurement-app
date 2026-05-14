import { useEffect, useRef } from 'react';
import { FaCamera, FaHistory } from 'react-icons/fa';

export default function HomePage({ onStart }: { onStart: (s: 'camera' | 'history') => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.clearRect(0, 0, w, h);

    // Simple animated background - fish silhouette
    ctx.fillStyle = '#FFF5F8';
    ctx.fillRect(0, 0, w, h);

    // Draw fish icon
    ctx.save();
    ctx.translate(w/2, h/2 - 20);
    ctx.scale(0.6, 0.6);
    ctx.fillStyle = '#FF6B9D';
    ctx.beginPath();
    ctx.ellipse(0, 0, 80, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.lineTo(-110, -40);
    ctx.lineTo(-110, 40);
    ctx.closePath();
    ctx.fill();
    // eye
    ctx.fillStyle = '#1A1A5E';
    ctx.beginPath();
    ctx.arc(40, -10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(42, -12, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  return (
    <div className="flex flex-col items-center justify-between min-h-dvh px-6 py-10" style={{ background: 'linear-gradient(180deg, #FFF5F8 0%, #ffffff 100%)' }}>
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <canvas ref={canvasRef} width={300} height={260} className="mb-6" />
        <h1 className="text-3xl font-bold text-dark mb-2 tracking-tight">魚長量測器</h1>
        <p className="text-sm text-dark/60 text-center max-w-xs leading-relaxed">
          把信用卡放在魚旁邊，<br/>
          拍張照就知道長度
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => onStart('camera')}
          className="w-full flex items-center justify-center gap-3 bg-primary text-white font-semibold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.97] transition-transform"
        >
          <FaCamera size={20} />
          <span>開始拍照量測</span>
        </button>
        <button
          onClick={() => onStart('history')}
          className="w-full flex items-center justify-center gap-3 bg-dark/5 text-dark font-semibold py-4 rounded-2xl active:scale-[0.97] transition-transform"
        >
          <FaHistory size={18} />
          <span>歷史量測記錄</span>
        </button>
      </div>

      <div className="mt-6 text-xs text-dark/30 text-center">
        支援信用卡參考物方案
      </div>
    </div>
  );
}
