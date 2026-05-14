import { useRef, useCallback, useState } from 'react';
import { FaDownload, FaHome, FaHistory, FaCamera, FaMapMarkerAlt, FaThermometerHalf, FaWind, FaSave } from 'react-icons/fa';
import type { Measurement } from '../types';

interface Props {
  measurement: Measurement;
  onSave: (m: Measurement) => void;
  onNew: () => void;
  onHistory: () => void;
  onHome: () => void;
}

export default function ResultPage({ measurement, onSave, onNew, onHistory, onHome }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    onSave(measurement);
    setSaved(true);
  }, [onSave, measurement]);

  const downloadCard = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;

    // Simple canvas-based card download
    const cardW = 1080;
    const cardH = 1350;
    const c = document.createElement('canvas');
    c.width = cardW;
    c.height = cardH;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, cardH);
    grad.addColorStop(0, '#FFF5F8');
    grad.addColorStop(1, '#FFE4EC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cardW, cardH);

    // Border
    ctx.strokeStyle = '#FF6B9D';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, cardW - 40, cardH - 40);

    // Image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ratio = Math.min((cardW - 120) / img.width, (cardH * 0.5) / img.height);
      const iw = img.width * ratio;
      const ih = img.height * ratio;
      const ix = (cardW - iw) / 2;
      const iy = 80;
      ctx.drawImage(img, ix, iy, iw, ih);

      // Title
      ctx.fillStyle = '#1A1A5E';
      ctx.font = 'bold 72px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('物體量測', cardW / 2, iy + ih + 100);

      // Length big number
      ctx.fillStyle = '#FF6B9D';
      ctx.font = 'bold 180px -apple-system, sans-serif';
      ctx.fillText(`${measurement.lengthCm}`, cardW / 2, iy + ih + 280);

      ctx.fillStyle = '#1A1A5E';
      ctx.font = '40px -apple-system, sans-serif';
      ctx.fillText(`cm 長度`, cardW / 2, iy + ih + 330);

      // Width
      if (measurement.widthCm) {
        ctx.fillStyle = '#1A1A5E';
        ctx.font = 'bold 120px -apple-system, sans-serif';
        ctx.fillText(`${measurement.widthCm}`, cardW / 2, iy + ih + 460);

        ctx.fillStyle = '#6b6375';
        ctx.font = '36px -apple-system, sans-serif';
        ctx.fillText(`cm 寬度`, cardW / 2, iy + ih + 510);
      }

      // Date
      const dateStr = new Date(measurement.timestamp).toLocaleString('zh-TW', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      ctx.fillStyle = '#6b6375';
      ctx.font = '40px -apple-system, sans-serif';
      ctx.fillText(dateStr, cardW / 2, iy + ih + 460);

      // Location
      if (measurement.gpsLat && measurement.gpsLng) {
        ctx.fillStyle = '#6b6375';
        ctx.font = '36px -apple-system, sans-serif';
        ctx.fillText(
          `${measurement.gpsLat.toFixed(4)}, ${measurement.gpsLng.toFixed(4)}`,
          cardW / 2, iy + ih + 520
        );
      }

      // Weather
      if (measurement.weather) {
        ctx.fillStyle = '#6b6375';
        ctx.font = '36px -apple-system, sans-serif';
        ctx.fillText(
          `${measurement.weather.temp}°C  ${measurement.weather.description}`,
          cardW / 2, iy + ih + 580
        );
      }

      // Brand
      ctx.fillStyle = '#FF6B9D';
      ctx.font = 'bold 32px -apple-system, sans-serif';
      ctx.fillText('measurement_app MVP', cardW / 2, cardH - 60);

      const link = document.createElement('a');
      link.download = `object_${measurement.lengthCm}cm_${Date.now()}.png`;
      link.href = c.toDataURL('image/png');
      link.click();
    };
    img.src = measurement.imageDataUrl;
  }, [measurement]);

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'linear-gradient(180deg, #FFF5F8 0%, #ffffff 100%)' }}>
      <div className="p-4 flex items-center gap-3">
        <button onClick={onHome} className="w-10 h-10 flex items-center justify-center rounded-full bg-dark/5 active:scale-90 transition-transform text-dark">
          <FaHome size={18} />
        </button>
        <h1 className="flex-1 text-xl font-bold text-dark">量測結果</h1>
      </div>

      <div className="flex-1 flex flex-col items-center px-6">
        {/* Result Card */}
        <div className="w-full bg-white rounded-2xl shadow-lg shadow-primary/10 overflow-hidden mb-6">
          <div className="relative">
            <img src={measurement.imageDataUrl} alt="object" className="w-full h-64 object-cover" />
            <div className="absolute top-3 right-3 bg-primary text-white px-3 py-1 rounded-lg text-sm font-bold shadow">
              物體量測
            </div>
          </div>
          <div className="p-5 text-center">
            <div className="text-sm text-dark/50 mb-1">量測結果</div>
            <div className="flex items-baseline justify-center gap-2">
              <div className="text-5xl font-bold text-primary tracking-tight">
                {measurement.lengthCm.toFixed(1)}
                <span className="text-xl text-dark/40 ml-1">cm</span>
              </div>
              {measurement.widthCm && (
                <div className="text-3xl font-bold text-dark tracking-tight">
                  × {measurement.widthCm.toFixed(1)}
                  <span className="text-lg text-dark/40 ml-1">cm</span>
                </div>
              )}
            </div>
            {measurement.widthCm && (
              <div className="text-xs text-dark/40 mt-1">長度 × 寬度</div>
            )}
          </div>

          <div className="px-5 pb-5 space-y-2">
            <div className="flex items-center gap-3 text-sm text-dark/70">
              <FaMapMarkerAlt className="text-primary shrink-0" size={14} />
              <span>
                {measurement.gpsLat && measurement.gpsLng
                  ? `${measurement.gpsLat.toFixed(4)}, ${measurement.gpsLng.toFixed(4)}`
                  : '無法取得位置'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-dark/70">
              <div className="w-3.5 text-center text-primary shrink-0 text-xs font-mono">
                {new Date(measurement.timestamp).getHours().toString().padStart(2, '0')}
              </div>
              <span>{new Date(measurement.timestamp).toLocaleString('zh-TW')}</span>
            </div>
            {measurement.weather && (
              <>
                <div className="flex items-center gap-3 text-sm text-dark/70">
                  <FaThermometerHalf className="text-primary shrink-0" size={14} />
                  <span>{measurement.weather.temp}°C {measurement.weather.description}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-dark/70">
                  <FaWind className="text-primary shrink-0" size={14} />
                  <span>{measurement.weather.windSpeed} m/s 風速</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="w-full space-y-3 mb-6">
          <button
            onClick={downloadCard}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-primary/20 active:scale-[0.97] transition-transform"
          >
            <FaDownload size={16} />
            下載資訊卡片
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold active:scale-[0.97] transition-transform ${
              saved
                ? 'bg-green-50 text-green-600'
                : 'bg-dark/5 text-dark'
            }`}
          >
            <FaSave size={16} />
            {saved ? '已儲存到歷史記錄' : '儲存到歷史記錄'}
          </button>
        </div>
      </div>

      <div className="p-4 pb-8 border-t border-dark/5">
        <div className="flex gap-3">
          <button
            onClick={onNew}
            className="flex-1 flex items-center justify-center gap-2 bg-dark/5 text-dark py-3 rounded-2xl font-semibold active:scale-[0.97] transition-transform"
          >
            <FaCamera size={16} />
            再拍一張
          </button>
          <button
            onClick={onHistory}
            className="flex-1 flex items-center justify-center gap-2 bg-dark/5 text-dark py-3 rounded-2xl font-semibold active:scale-[0.97] transition-transform"
          >
            <FaHistory size={16} />
            歷史記錄
          </button>
        </div>
      </div>
    </div>
  );
}
