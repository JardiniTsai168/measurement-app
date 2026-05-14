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

    // Simple animated background - object icon
    ctx.fillStyle = '#FFF5F8';
    ctx.fillRect(0, 0, w, h);

    // Draw ruler + measurement icon
    ctx.save();
    ctx.translate(w/2, h/2 - 20);
    ctx.scale(0.6, 0.6);
    ctx.fillStyle = '#FF6B9D';
    // Ruler body
    ctx.fillRect(-90, -25, 180, 50);
    // Ruler ticks
    ctx.fillStyle = '#1A1A5E';
    for (let i = -80; i <= 80; i += 20) {
      ctx.fillRect(i, -25, 3, 20);
    }
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('8.5cm', 0, 8);
    ctx.restore();
  }, []);

  return (
    <div className="flex flex-col items-center justify-between min-h-dvh px-6 py-10" style={{ background: 'linear-gradient(180deg, #FFF5F8 0%, #ffffff 100%)' }}>
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <canvas ref={canvasRef} width={300} height={260} className="mb-6" />
        <h1 className="text-3xl font-bold text-dark mb-2 tracking-tight">物體量測器</h1>
        <p className="text-sm text-dark/60 text-center max-w-xs leading-relaxed">
          把信用卡放在物體旁邊，<br/>
          拍張照就知道長度與寬度
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
        信用卡參考物方案 · 支援任意物體
      </div>
    </div>
  );
}
