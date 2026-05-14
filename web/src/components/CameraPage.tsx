import { useRef, useState, useCallback, useEffect } from 'react';
import { FaCamera, FaImages, FaArrowLeft, FaSyncAlt } from 'react-icons/fa';

interface Props {
  onImageSelected: (dataUrl: string) => void;
  onBack: () => void;
}

export default function CameraPage({ onImageSelected, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStream = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'preview'>('idle');
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [preview, setPreview] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Stop any active stream
  const stopStream = useCallback(() => {
    if (currentStream.current) {
      currentStream.current.getTracks().forEach(t => t.stop());
      currentStream.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  // iOS Safari: must await play() and handle autoplay policy
  const startCamera = useCallback(async () => {
    setErrorMsg('');
    setStatus('requesting');

    // Stop any previous stream first
    if (currentStream.current) {
      currentStream.current.getTracks().forEach(t => t.stop());
      currentStream.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStream.current = stream;

      const video = videoRef.current;
      if (!video) {
        stopStream();
        return;
      }

      video.srcObject = stream;
      
      // iOS Safari requires explicit play() call
      try {
        await video.play();
      } catch (playErr) {
        console.warn('video.play() failed, trying muted autoplay workaround', playErr);
        video.muted = true;
        video.playsInline = true;
        await video.play();
      }

      setStatus('active');
    } catch (err: any) {
      console.error('getUserMedia error:', err);
      const msg = err?.name || String(err);
      if (msg.includes('NotAllowed') || msg.includes('Permission')) {
        setErrorMsg('相機權限被拒絕');
        setStatus('denied');
      } else if (msg.includes('NotFound')) {
        setErrorMsg('找不到相機，請從相簿選擇照片');
        setStatus('denied');
      } else {
        setErrorMsg(`相機啟動失敗: ${msg}`);
        setStatus('denied');
      }
      currentStream.current = null;
    }
  }, [facing, stopStream]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setErrorMsg('相機尚未準備好，請稍等一下');
      return;
    }
    const c = document.createElement('canvas');
    c.width = video.videoWidth || video.clientWidth || 1280;
    c.height = video.videoHeight || video.clientHeight || 720;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Handle selfie mirror
    if (facing === 'user') {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, c.width, c.height);

    const dataUrl = c.toDataURL('image/jpeg', 0.92);
    stopStream();
    setPreview(dataUrl);
    setStatus('preview');
  }, [facing, stopStream]);

  const confirmPhoto = useCallback(() => {
    if (!preview) return;
    onImageSelected(preview);
  }, [preview, onImageSelected]);

  const retake = useCallback(() => {
    setPreview('');
    setStatus('idle');
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    stopStream();
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setStatus('preview');
    };
    reader.readAsDataURL(f);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [stopStream]);

  const toggleFacing = useCallback(() => {
    setFacing(p => p === 'environment' ? 'user' : 'environment');
  }, []);

  // Restart camera when facing changes
  useEffect(() => {
    if (status === 'active' || status === 'requesting') {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentStream.current) {
        currentStream.current.getTracks().forEach(t => t.stop());
        currentStream.current = null;
      }
    };
  }, []);

  // ========== Preview mode ==========
  if (status === 'preview') {
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

  // ========== Camera mode ==========
  return (
    <div className="flex flex-col min-h-dvh bg-black relative" style={{ touchAction: 'none' }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <button 
          onClick={() => { stopStream(); onBack(); }} 
          className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md text-white rounded-full active:scale-90 transition-transform"
        >
          <FaArrowLeft size={18} />
        </button>
        {status === 'active' && (
          <button 
            onClick={toggleFacing} 
            className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md text-white rounded-full active:scale-90 transition-transform"
          >
            <FaSyncAlt size={16} />
          </button>
        )}
      </div>

      {/* Hidden video element - always present for iOS */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          display: status === 'active' ? 'block' : 'none',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: facing === 'user' ? 'scaleX(-1)' : 'none',
        }}
      />

      {/* Loading spinner while requesting */}
      {status === 'requesting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
          <div className="w-12 h-12 border-3 border-white/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-white/60 text-sm">正在啟動相機...</p>
        </div>
      )}

      {/* Idle / Denied — show camera controls */}
      {(status === 'idle' || status === 'denied') && (
        <div className="flex-1 flex flex-col items-center justify-center text-white/80 px-6 gap-4 z-10">
          {errorMsg ? (
            <>
              <FaCamera size={40} className="mb-2 text-red-400" />
              <p className="text-center text-red-300 font-medium">{errorMsg}</p>
            </>
          ) : (
            <>
              <FaCamera size={48} className="mb-2" />
              <p className="text-center text-sm opacity-70">
                需要相機權限來拍照，<br/>或從相簿選擇現有照片
              </p>
            </>
          )}

          <button 
            onClick={startCamera} 
            className="w-full max-w-xs bg-primary text-white px-6 py-4 rounded-2xl font-semibold active:scale-95 transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <FaCamera size={18}/> 
            {errorMsg ? '重試相機' : '允許相機拍照'}
          </button>

          <label className="w-full max-w-xs bg-white/10 text-white px-6 py-4 rounded-2xl font-semibold active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-2">
            <FaImages size={18} />
            <span>從相簿選擇</span>
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </label>
        </div>
      )}

      {/* Camera controls when active */}
      {status === 'active' && (
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 flex items-center justify-center gap-6">
          <label className="w-14 h-14 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white active:scale-90 transition-transform cursor-pointer">
            <FaImages size={20} />
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </label>
          <button 
            onClick={takePhoto} 
            className="w-20 h-20 rounded-full border-4 border-white/80 bg-white/30 active:scale-90 transition-transform flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-white shadow-lg" />
          </button>
          <div className="w-14" />
        </div>
      )}
    </div>
  );
}
