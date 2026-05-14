import { useEffect, useState } from 'react';
import { FaArrowLeft, FaTrash } from 'react-icons/fa';
import type { Measurement } from '../types';
import { getMeasurements, deleteMeasurement } from '../utils/db';

interface Props {
  onBack: () => void;
  onSelect: (m: Measurement) => void;
}

export default function HistoryPage({ onBack, onSelect }: Props) {
  const [items, setItems] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMeasurements().then(data => {
      setItems(data.reverse());
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    await deleteMeasurement(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <div className="p-4 flex items-center gap-3 border-b border-dark/5">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-dark/5 active:scale-90 transition-transform text-dark">
          <FaArrowLeft size={16} />
        </button>
        <h1 className="flex-1 text-xl font-bold text-dark">歷史記錄</h1>
        <span className="text-sm text-dark/40">{items.length} 筆</span>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-dark/30 px-6">
          <p className="text-center">還沒有量測記錄</p>
          <p className="text-sm mt-1">去拍張照片量測物體吧！</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.map(m => (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              className="flex items-center gap-3 bg-dark/3 rounded-xl p-3 active:scale-[0.98] transition-transform cursor-pointer"
            >
              <img src={m.imageDataUrl} alt="" className="w-20 h-20 object-cover rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-primary">{m.lengthCm.toFixed(1)}</span>
                  <span className="text-sm text-dark/40">cm</span>
                  {m.widthCm && (
                    <>
                      <span className="text-lg text-dark/30 mx-0.5">×</span>
                      <span className="text-xl font-bold text-dark">{m.widthCm.toFixed(1)}</span>
                      <span className="text-sm text-dark/40">cm</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-dark/50 mt-0.5">
                  {new Date(m.timestamp).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                {m.gpsLat && m.gpsLng && (
                  <div className="text-xs text-dark/30 mt-0.5">
                    GPS {m.gpsLat.toFixed(3)},{m.gpsLng.toFixed(3)}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-red-400 active:scale-90 transition-transform shrink-0"
              >
                <FaTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
