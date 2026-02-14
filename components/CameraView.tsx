import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CapturedPhoto, StickerOption } from '../types';
import { audioService } from '../services/audioService';

interface CameraViewProps {
  onCapture: (dataUrl: string) => void;
  isCapturing: boolean;
  countdown: number | null;
  selectedStickers: StickerOption[];
  stickerStyle: 'single' | 'burst' | 'chaos' | 'border' | 'corners';
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, isCapturing, countdown, selectedStickers, stickerStyle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Pre-load stickers as images for canvas drawing
  const stickerImages = useRef<{ [url: string]: HTMLImageElement }>({});

  useEffect(() => {
    selectedStickers.forEach(sticker => {
      if (!stickerImages.current[sticker.url]) {
        const img = new Image();
        img.src = sticker.url;
        stickerImages.current[sticker.url] = img;
      }
    });
  }, [selectedStickers]);

  useEffect(() => {
    let mounted = true;

    async function setupCamera() {
      try {
        // Flexible constraints for broad compatibility (ASUS, Mac, Mobile)
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1920, max: 4096 }, // Target 1080p, support up to 4K
            height: { ideal: 1080, max: 2160 }
          },
          audio: false
        }).catch(() => {
          // Fallback to basic video if ideal fails
          return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        });

        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } else {
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Camera access denied or hardware error:", err);
      }
    }

    setupCamera();

    return () => {
      mounted = false;
      // Clean up stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Effect to handle current stream update to video element
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const takeSnapshot = useCallback(async () => {
    if (videoRef.current && canvasRef.current) {
      audioService.playShutter();
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        // Use actual video dimensions for high quality
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // High quality drawing settings
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        // Mirror the image
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Restore scale for drawing stickers
        context.setTransform(1, 0, 0, 1, 0, 0);

        const dataUrl = canvas.toDataURL('image/png', 0.9);
        onCapture(dataUrl);
      }
    }
  }, [onCapture]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      audioService.playBeep();
    }
    if (countdown === 0) {
      takeSnapshot();
    }
  }, [countdown, takeSnapshot]);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-pink-100 aspect-[4/3] w-full max-w-2xl mx-auto">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]"
      />

      {/* Sticker Overlays on Camera */}
      <div className="absolute inset-0 pointer-events-none">
        {selectedStickers.flatMap((sticker, sIdx) => {
          const STICKER_STYLES = [
            { bottom: '5%', left: '5%' }, { top: '5%', right: '5%' },
            { top: '5%', left: '5%' }, { bottom: '5%', right: '5%' },
            { top: '5%', left: '42.5%' }, { top: '40%', left: '5%' },
            { top: '40%', right: '5%' },
          ];

          const BORDER_STYLES = [
            { top: '2%', left: '2%' }, { top: '2%', left: '25%' }, { top: '2%', left: '50%' }, { top: '2%', left: '75%' }, { top: '2%', right: '2%' },
            { bottom: '2%', left: '2%' }, { bottom: '2%', left: '25%' }, { bottom: '2%', left: '50%' }, { bottom: '2%', left: '75%' }, { bottom: '2%', right: '2%' },
            { top: '25%', left: '2%' }, { top: '50%', left: '2%' }, { top: '75%', left: '2%' },
            { top: '25%', right: '2%' }, { top: '50%', right: '2%' }, { top: '75%', right: '2%' },
          ];

          const CORNER_STYLES = [
            { top: '3%', left: '3%' }, { top: '10%', left: '3%' }, { top: '3%', left: '10%' },
            { top: '3%', right: '3%' }, { top: '10%', right: '3%' }, { top: '3%', right: '10%' },
            { bottom: '3%', left: '3%' }, { bottom: '10%', left: '3%' }, { bottom: '3%', left: '10%' },
            { bottom: '3%', right: '3%' }, { bottom: '10%', right: '3%' }, { bottom: '3%', right: '10%' },
          ];

          let configs: { style: React.CSSProperties; key: string }[] = [];

          if (stickerStyle === 'burst') {
            configs = STICKER_STYLES.map((pos, i) => ({ style: pos, key: `${sticker.id}-burst-${i}` }));
          } else if (stickerStyle === 'border') {
            configs = BORDER_STYLES.map((pos, i) => ({ style: { ...pos, transform: 'scale(0.7)' }, key: `${sticker.id}-border-${i}` }));
          } else if (stickerStyle === 'corners') {
            configs = CORNER_STYLES.map((pos, i) => ({ style: pos, key: `${sticker.id}-corners-${i}` }));
          } else if (stickerStyle === 'chaos') {
            for (let i = 0; i < 6; i++) {
              const seed = (sIdx + 1) * (i + 1);
              configs.push({
                key: `${sticker.id}-chaos-${i}`,
                style: {
                  top: `${(seed * 17) % 80 + 5}%`,
                  left: `${(seed * 23) % 80 + 5}%`,
                  transform: `rotate(${(seed * 45) % 360}deg) scale(${(seed % 5) * 0.2 + 0.6})`,
                  opacity: 0.9,
                }
              });
            }
          } else {
            configs = [{ style: STICKER_STYLES[sIdx % STICKER_STYLES.length], key: `${sticker.id}-single` }];
          }

          return configs.map(cfg => (
            <div key={cfg.key} className="absolute w-[15%] h-[15%] transition-all duration-500 animate-in zoom-in" style={cfg.style}>
              <img src={sticker.url} className="w-full h-full object-contain drop-shadow-md hover:scale-110 transition-transform" alt="Sticker" crossOrigin="anonymous" />
            </div>
          ));
        })}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="text-9xl font-bold text-white drop-shadow-lg animate-ping">
            {countdown === 0 ? "❤️" : countdown}
          </div>
        </div>
      )}

      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-pink-400 p-8 text-center">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-xl font-medium">Please allow camera access to start the love booth!</p>
        </div>
      )}
    </div>
  );
};
