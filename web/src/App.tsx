import { useState, useCallback } from 'react';
import type { Measurement, AppStep, Rect, Point } from './types';
import HomePage from './components/HomePage';
import CameraPage from './components/CameraPage';
import EditCardPage from './components/EditCardPage';
import EditFishPage from './components/EditFishPage';
import ResultPage from './components/ResultPage';
import HistoryPage from './components/HistoryPage';
import { saveMeasurement } from './utils/db';

export default function App() {
  const [step, setStep] = useState<AppStep>('home');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [cardRect, setCardRect] = useState<Rect>({x:0,y:0,w:0,h:0});
  const [result, setResult] = useState<Measurement | null>(null);

  const goto = useCallback((s: AppStep) => setStep(s), []);

  const onImageSelected = useCallback((dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setStep('edit-card');
  }, []);

  const onCardConfirmed = useCallback((rect: Rect) => {
    setCardRect(rect);
    setStep('edit-fish');
  }, []);

  const onFishConfirmed = useCallback((head: Point, tail: Point, lenCm: number) => {
    const m: Measurement = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      imageDataUrl,
      cardRect,
      headPoint: head,
      tailPoint: tail,
      lengthCm: Number(lenCm.toFixed(2)),
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          m.gpsLat = pos.coords.latitude;
          m.gpsLng = pos.coords.longitude;
          setResult({...m});
        },
        () => { setResult({...m}); }
      );
    } else {
      setResult(m);
    }
    setStep('result');
  }, [imageDataUrl, cardRect]);

  const onSaveToHistory = useCallback((m: Measurement) => {
    saveMeasurement(m).catch(() => {});
  }, []);

  return (
    <div className="min-h-dvh bg-white">
      {step === 'home' && <HomePage onStart={goto} />}
      {step === 'camera' && (
        <CameraPage
          onImageSelected={onImageSelected}
          onBack={() => goto('home')}
        />
      )}
      {step === 'edit-card' && imageDataUrl && (
        <EditCardPage
          imageDataUrl={imageDataUrl}
          onConfirm={onCardConfirmed}
          onBack={() => goto('camera')}
        />
      )}
      {step === 'edit-fish' && imageDataUrl && cardRect.w > 0 && (
        <EditFishPage
          imageDataUrl={imageDataUrl}
          cardRect={cardRect}
          onConfirm={onFishConfirmed}
          onBack={() => goto('edit-card')}
        />
      )}
      {step === 'result' && result && (
        <ResultPage
          measurement={result}
          onSave={onSaveToHistory}
          onNew={() => { setImageDataUrl(''); goto('camera'); }}
          onHistory={() => goto('history')}
          onHome={() => goto('home')}
        />
      )}
      {step === 'history' && (
        <HistoryPage
          onBack={() => goto('home')}
          onSelect={(m) => { setResult(m); goto('result'); }}
        />
      )}
    </div>
  );
}
