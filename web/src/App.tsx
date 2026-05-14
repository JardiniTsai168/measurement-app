import { useState, useCallback } from 'react';
import type { Measurement, AppStep, Rect, Point } from './types';
import HomePage from './components/HomePage';
import CameraPage from './components/CameraPage';
import EditCardPage from './components/EditCardPage';
import EditObjectPage from './components/EditObjectPage';
import ResultPage from './components/ResultPage';
import HistoryPage from './components/HistoryPage';
import { saveMeasurement } from './utils/db';
import { fetchWeather } from './utils/weather';

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
    setStep('edit-object');
  }, []);

  const onObjectConfirmed = useCallback((
    lengthStart: Point,
    lengthEnd: Point,
    widthStart: Point | null,
    widthEnd: Point | null,
    lengthCm: number,
    widthCm: number | null
  ) => {
    const m: Measurement = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      imageDataUrl,
      cardRect,
      headPoint: lengthStart,
      tailPoint: lengthEnd,
      lengthCm: Number(lengthCm.toFixed(2)),
      widthCm: widthCm ? Number(widthCm.toFixed(2)) : undefined,
      widthStart: widthStart ?? undefined,
      widthEnd: widthEnd ?? undefined,
    };

    setResult(m);
    setStep('result');

    // Fetch GPS + weather asynchronously after showing result
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const updated: Measurement = {
            ...m,
            gpsLat: pos.coords.latitude,
            gpsLng: pos.coords.longitude,
          };
          // Try fetch weather
          const weather = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
          if (weather) {
            updated.weather = weather;
          }
          setResult(updated);
        },
        () => {
          // GPS failed, keep result without location
        }
      );
    }
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
      {step === 'edit-object' && imageDataUrl && cardRect.w > 0 && (
        <EditObjectPage
          imageDataUrl={imageDataUrl}
          cardRect={cardRect}
          onConfirm={onObjectConfirmed}
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
