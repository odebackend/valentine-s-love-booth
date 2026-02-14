import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CapturedPhoto, StickerOption, FrameOption, BackgroundOption } from '../types';
import { audioService } from '../services/audioService';

interface CameraViewProps {
  onCapture: (dataUrl: string) => void;
  isCapturing: boolean;
  countdown: number | null;
  selectedStickers: StickerOption[];
  stickerStyle: 'single' | 'burst' | 'chaos' | 'border' | 'corners';
  frame: FrameOption;
  background: BackgroundOption;
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, isCapturing, countdown, selectedStickers, stickerStyle, frame, background }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Pre-load stickers, frame, and background images for canvas drawing
  const stickerImages = useRef<{ [url: string]: HTMLImageElement }>({});
  const frameImage = useRef<HTMLImageElement | null>(null);
  const backgroundImage = useRef<HTMLImageElement | null>(null);

  // Preload stickers only when they change
  useEffect(() => {
    selectedStickers.forEach(sticker => {
      if (!stickerImages.current[sticker.url]) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = sticker.url;
        stickerImages.current[sticker.url] = img;
      }
    });
  }, [selectedStickers]);

  // Preload frame only when it changes
  useEffect(() => {
    if (frame.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = frame.imageUrl;
      img.onload = () => {
        frameImage.current = img;
      };
      img.onerror = () => {
        frameImage.current = null;
      };
    } else {
      frameImage.current = null;
    }
  }, [frame.imageUrl]);

  // Preload background only when it changes
  useEffect(() => {
    if (background.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = background.imageUrl;
      img.onload = () => {
        backgroundImage.current = img;
      };
      img.onerror = () => {
        backgroundImage.current = null;
      };
    } else {
      backgroundImage.current = null;
    }
  }, [background.imageUrl]);

  useEffect(() => {
    let mounted = true;

    async function setupCamera() {
      try {
        // Optimized constraints for smooth performance
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280, max: 1920 }, // Balance quality and performance
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 } // Smooth 30fps
          },
          audio: false
        }).catch(() => {
          // Fallback to basic video if ideal fails
          return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        });

        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            // Ensure video plays smoothly
            videoRef.current.play().catch(console.error);
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
      const context = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
      if (context) {
        // Use actual video dimensions for high quality
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // High quality drawing settings
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        // Layer 1: Draw background
        if (backgroundImage.current?.complete) {
          if (background.id.startsWith('bg-sticker')) {
            // Tile pattern for sticker backgrounds
            const pattern = context.createPattern(backgroundImage.current, 'repeat');
            if (pattern) {
              context.fillStyle = pattern;
              context.fillRect(0, 0, canvas.width, canvas.height);
            }
          } else {
            // Cover for photo backgrounds
            const scale = Math.max(canvas.width / backgroundImage.current.width, canvas.height / backgroundImage.current.height);
            const x = (canvas.width - backgroundImage.current.width * scale) / 2;
            const y = (canvas.height - backgroundImage.current.height * scale) / 2;
            context.drawImage(backgroundImage.current, x, y, backgroundImage.current.width * scale, backgroundImage.current.height * scale);
          }
        }

        // Layer 2: Draw the video (mirrored)
        context.save();
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.restore();

        // Layer 3: Draw frame pattern with transparency
        if (frameImage.current?.complete) {
          const pattern = context.createPattern(frameImage.current, 'repeat');
          if (pattern) {
            context.globalAlpha = 0.3; // Semi-transparent overlay
            context.fillStyle = pattern;
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.globalAlpha = 1.0;
          }
        }

        // Layer 4: Draw stickers (optimized)
        const stickerSize = canvas.width * 0.15;
        
        selectedStickers.forEach((sticker, sIdx) => {
          const img = stickerImages.current[sticker.url];
          if (!img?.complete) return;

          const positions = getStickerPositions(sIdx, stickerStyle);
          
          positions.forEach((pos) => {
            const size = pos.scale ? canvas.width * pos.scale : stickerSize;
            let x = pos.left !== undefined ? canvas.width * pos.left : 
                    pos.right !== undefined ? canvas.width * (1 - pos.right) - size : 
                    canvas.width * 0.5 - size / 2;
            
            let y = pos.top !== undefined ? canvas.height * pos.top : 
                    pos.bottom !== undefined ? canvas.height * (1 - pos.bottom) - size : 
                    canvas.height * 0.5 - size / 2;

            context.save();
            context.translate(x + size / 2, y + size / 2);
            if (pos.rotation) context.rotate((pos.rotation * Math.PI) / 180);
            context.drawImage(img, -size / 2, -size / 2, size, size);
            context.restore();
          });
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92); // JPEG for better performance
        onCapture(dataUrl);
      }
    }
  }, [onCapture, selectedStickers, stickerStyle, frame, background]);

  // Helper function to get sticker positions (memoized logic)
  const getStickerPositions = (sIdx: number, style: string) => {
    const STICKER_STYLES = [
      { bottom: 0.05, left: 0.05 }, { top: 0.05, right: 0.05 },
      { top: 0.05, left: 0.05 }, { bottom: 0.05, right: 0.05 },
      { top: 0.05, left: 0.425 }, { top: 0.40, left: 0.05 },
      { top: 0.40, right: 0.05 },
    ];

    const BORDER_STYLES = [
      { top: 0.02, left: 0.02 }, { top: 0.02, left: 0.25 }, { top: 0.02, left: 0.50 }, { top: 0.02, left: 0.75 }, { top: 0.02, right: 0.02 },
      { bottom: 0.02, left: 0.02 }, { bottom: 0.02, left: 0.25 }, { bottom: 0.02, left: 0.50 }, { bottom: 0.02, left: 0.75 }, { bottom: 0.02, right: 0.02 },
      { top: 0.25, left: 0.02 }, { top: 0.50, left: 0.02 }, { top: 0.75, left: 0.02 },
      { top: 0.25, right: 0.02 }, { top: 0.50, right: 0.02 }, { top: 0.75, right: 0.02 },
    ].map(p => ({ ...p, scale: 0.10 }));

    const CORNER_STYLES = [
      { top: 0.03, left: 0.03 }, { top: 0.10, left: 0.03 }, { top: 0.03, left: 0.10 },
      { top: 0.03, right: 0.03 }, { top: 0.10, right: 0.03 }, { top: 0.03, right: 0.10 },
      { bottom: 0.03, left: 0.03 }, { bottom: 0.10, left: 0.03 }, { bottom: 0.03, left: 0.10 },
      { bottom: 0.03, right: 0.03 }, { bottom: 0.10, right: 0.03 }, { bottom: 0.03, right: 0.10 },
    ];

    if (style === 'burst') return STICKER_STYLES;
    if (style === 'border') return BORDER_STYLES;
    if (style === 'corners') return CORNER_STYLES;
    if (style === 'chaos') {
      const positions = [];
      for (let i = 0; i < 6; i++) {
        const seed = (sIdx + 1) * (i + 1);
        positions.push({
          top: ((seed * 17) % 80 + 5) / 100,
          left: ((seed * 23) % 80 + 5) / 100,
          rotation: (seed * 45) % 360,
          scale: (seed % 5) * 0.02 + 0.08
        });
      }
      return positions;
    }
    return [STICKER_STYLES[sIdx % STICKER_STYLES.length]];
  };

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
        style={{ transform: 'scaleX(-1)', willChange: 'transform' }}
      />

      {/* Sticker Overlays on Camera */}
      <div className="absolute inset-0 pointer-events-none z-10">{selectedStickers.flatMap((sticker, sIdx) => {
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
            <div key={cfg.key} className="absolute w-[15%] h-[15%] transition-transform duration-300" style={cfg.style}>
              <img 
                src={sticker.url} 
                className="w-full h-full object-contain drop-shadow-md" 
                alt="Sticker" 
                crossOrigin="anonymous"
                loading="eager"
                decoding="sync"
              />
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
