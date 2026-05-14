import { useRef, useState, useCallback } from 'react';
import { FaCamera, FaImages, FaArrowLeft, FaSyncAlt } from 'react-icons/fa';

interface Props {
  onImageSelected: (dataUrl: string) => void;
  onBack: () => void;
}

export default function CameraPage({ onImageSelected, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [preview, setPreview] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (stream) stream.getTracks().forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(s);
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch {
      setHasPermission(false);
    }
  }, [facing, stream]);

  const stopCamera = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  }, [stream]);

  const takePhoto = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    // Mirror correction for back camera not needed usually, but for selfie we might
    if (facing === 'user') {
      ctx.save();
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(v, 0, 0);
      ctx.restore();
    }
    const dataUrl = c.toDataURL('image/jpeg', 0.92);
    setPreview(dataUrl);
    stopCamera();
  }, [facing, stopCamera]);

  const confirmPhoto = useCallback(() => {
    if (!preview) return;
    onImageSelected(preview);
  }, [preview, onImageSelected]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setPreview(reader.result as string); };
    reader.readAsDataURL(f);
  }, []);

  const retake = useCallback(() => {
    setPreview('');
    startCamera();
  }, [startCamera]);

  const toggleFacing = useCallback(() => {
    setFacing(p => p === 'environment' ? 'user' : 'environment');
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
    setTimeout(startCamera, 300);
  }, [stream, startCamera]);

  if (preview) {
    return (
      <div className="flex flex-col min-h-dvh bg-black">
        <img src={preview} alt="preview" className="flex-1 object-contain w-full" />
        <div className="p-4 bg-dark flex gap-3">
          <button onClick={retake} className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white py-3 rounded-xl active:scale-95 transition-transform">
            <FaSyncAlt size={16} /> 重拍
          </button>
          <button onClick={confirmPhoto} className="flex-[2] flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl active:scale-95 transition-transform font-semibold">
            <FaCamera size={16} /> 確認使用
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-black relative">
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <button onClick={() => { stopCamera(); onBack(); }} className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md text-white rounded-full active:scale-90 transition-transform">
          <FaArrowLeft size={18} />
        </button>
        <button onClick={toggleFacing} className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md text-white rounded-full active:scale-90 transition-transform">
          <FaSyncAlt size={16} />
        </button>
      </div>

      {!stream && hasPermission === null && (
        <div className="flex-1 flex flex-col items-center justify-center text-white/80 px-6 gap-4">
          <FaCamera size={48} className="mb-2" />
          <p className="text-center text-sm opacity-70">
            需要相機權限來拍照，<br/>或從相簿選擇現有照片
          </p>
          <button onClick={startCamera} className="bg-primary text-white px-6 py-3 rounded-xl font-semibold active:scale-95 transition-transform">
            <FaCamera className="inline mr-2" size={16}/> 允許相機拍照
          </button>
          <label className="bg-white/10 text-white px-6 py-3 rounded-xl font-semibold active:scale-95 transition-transform cursor-pointer flex items-center gap-2">
            <FaImages size={16} />
            <span>從相簿選擇</span>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </label>
        </div>
      )}

      {stream && (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="flex-1 object-cover w-full" style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 flex items-center justify-center gap-6">
            <label className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-transform cursor-pointer">
              <FaImages size={20} />
              <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            </label>
            <button onClick={takePhoto} className="w-18 h-18 rounded-full border-4 border-white bg-white/20 active:scale-90 transition-transform flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
            <div className="w-12" />
          </div>
        </>
      )}

      {hasPermission === false && (
        <div className="flex-1 flex flex-col items-center justify-center text-white/80 px-6 gap-4">
          <FaImages size={48} className="mb-2" />
          <p className="text-center text-sm opacity-70">
            相機權限被拒絕，<br/>請從相簿選擇照片
          </p>
          <label className="bg-primary text-white px-6 py-3 rounded-xl font-semibold active:scale-95 transition-transform cursor-pointer flex items-center gap-2">
            <FaImages size={16} />
            <span>從相簿選擇</span>
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </label>
          <button onClick={() => { setHasPermission(null); startCamera(); }} className="text-white/60 text-sm underline">
            重新試試相機
          </button>
        </div>
      )}
    </div>
  );
}
