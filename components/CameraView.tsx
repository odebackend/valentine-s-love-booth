import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CapturedPhoto, StickerOption } from '../types';
import { audioService } from '../services/audioService';

interface CameraViewProps {
  onCapture: (dataUrl: string) => void;
  isCapturing: boolean;
  countdown: number | null;
  selectedStickers: StickerOption[];
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, isCapturing, countdown, selectedStickers }) => {
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
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
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

        // Mirror the image
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Restore scale for drawing stickers (so stickers aren't mirrored if we don't want them to be)
        // Actually, usually stickers stay normal.
        context.setTransform(1, 0, 0, 1, 0, 0);

        // Draw stickers
        const stickerSize = canvas.width * 0.15;
        const STICKER_POSITIONS = [
          { x: 0.1, y: 0.75 },  // Bottom Left
          { x: 0.75, y: 0.1 },  // Top Right
          { x: 0.1, y: 0.1 },   // Top Left
          { x: 0.75, y: 0.75 }, // Bottom Right
          { x: 0.425, y: 0.1 }, // Top Center
          { x: 0.1, y: 0.4 },   // Mid Left
          { x: 0.75, y: 0.4 },  // Mid Right
        ];

        selectedStickers.forEach((sticker, index) => {
          const img = stickerImages.current[sticker.url];
          if (img && img.complete) {
            const pos = STICKER_POSITIONS[index % STICKER_POSITIONS.length];
            const x = canvas.width * pos.x;
            const y = canvas.height * pos.y;
            context.drawImage(img, x, y, stickerSize, stickerSize);
          }
        });

        const dataUrl = canvas.toDataURL('image/png', 0.9);
        onCapture(dataUrl);
      }
    }
  }, [onCapture, selectedStickers]);

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
        {selectedStickers.map((sticker, index) => {
          const STICKER_STYLES = [
            { bottom: '5%', left: '5%' },   // Bottom Left
            { top: '5%', right: '5%' },    // Top Right
            { top: '5%', left: '5%' },     // Top Left
            { bottom: '5%', right: '5%' }, // Bottom Right
            { top: '5%', left: '42.5%' },  // Top Center
            { top: '40%', left: '5%' },    // Mid Left
            { top: '40%', right: '5%' },   // Mid Right
          ];
          const pos = STICKER_STYLES[index % STICKER_STYLES.length];

          return (
            <div
              key={sticker.id}
              className="absolute w-[15%] h-[15%] transition-all duration-300 animate-in zoom-in"
              style={pos}
            >
              <img src={sticker.url} className="w-full h-full object-contain drop-shadow-lg" alt="Decoration" />
            </div>
          );
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
