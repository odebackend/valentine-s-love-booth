import React, { useState, useEffect, useCallback } from 'react';
import { CameraView } from './components/CameraView';
import { PhotoStrip } from './components/PhotoStrip';
import { FRAMES, BACKGROUNDS, HEART_ICON } from './constants';
import { CapturedPhoto, FrameOption, BackgroundOption } from './types';

const MAX_PHOTOS = 4;
const INITIAL_COUNTDOWN = 3;

export default function App() {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameOption>(FRAMES[0]);
  const [hoveredFrame, setHoveredFrame] = useState<FrameOption | null>(null);
  const [selectedBg, setSelectedBg] = useState<BackgroundOption>(BACKGROUNDS[0]);

  const startPhotobooth = () => {
    setPhotos([]);
    setIsCapturing(true);
    startCountdown();
  };

  const startCountdown = () => {
    setCountdown(INITIAL_COUNTDOWN);
  };

  useEffect(() => {
    let timer: number;
    if (countdown !== null && countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      timer = window.setTimeout(() => setCountdown(null), 800);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleCapture = useCallback((dataUrl: string) => {
    // Convert dataUrl to a Blob URL for better performance and rendering stability in html-to-image
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        setPhotos(prev => {
          const newPhotos = [...prev, { id: Date.now().toString(), dataUrl: blobUrl }];
          if (newPhotos.length < MAX_PHOTOS) {
            setTimeout(startCountdown, 1500);
          } else {
            setIsCapturing(false);
          }
          return newPhotos;
        });
      });
  }, []);



  const reset = () => {
    photos.forEach(p => URL.revokeObjectURL(p.dataUrl));
    setPhotos([]);
    setIsCapturing(false);
    setCountdown(null);
  };

  const isDarkBg = selectedBg.id === 'starlight';

  return (
    <div className={`min-h-screen py-8 px-4 overflow-x-hidden transition-all duration-700 ${selectedBg.className}`}>
      {/* Decorative Floating Hearts - only show on light backgrounds for contrast */}
      {!isDarkBg && (
        <>
          <div className="fixed top-10 left-10 text-pink-300 animate-float opacity-40 pointer-events-none">{HEART_ICON}</div>
          <div className="fixed bottom-20 right-10 text-pink-300 animate-float opacity-40 [animation-delay:1s] pointer-events-none">{HEART_ICON}</div>
          <div className="fixed top-1/2 left-5 text-pink-200 animate-float opacity-30 [animation-delay:1.5s] pointer-events-none">{HEART_ICON}</div>
        </>
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="text-center mb-10">
          <h1 className={`text-5xl md:text-7xl font-pacifico drop-shadow-sm mb-4 transition-colors duration-500 ${isDarkBg ? 'text-pink-300' : 'text-pink-500'}`}>
            Love Booth
          </h1>
          <p className={`font-medium tracking-wide flex items-center justify-center gap-2 transition-colors duration-500 ${isDarkBg ? 'text-pink-200' : 'text-pink-400'}`}>
            <span>CAPTURE YOUR VALENTINE MEMORIES</span>
            <span className="text-pink-300">{HEART_ICON}</span>
          </p>
        </header>

        <main className="flex flex-col items-center">
          {photos.length < MAX_PHOTOS ? (
            <div className="w-full flex flex-col items-center space-y-8">
              <CameraView
                onCapture={handleCapture}
                isCapturing={isCapturing}
                countdown={countdown}
              />

              <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
                {!isCapturing && (
                  <div className="w-full flex flex-col md:flex-row gap-4 relative">
                    {/* Background Selection */}
                    <div className="flex-1 bg-white/90 backdrop-blur-sm p-5 rounded-3xl shadow-lg flex flex-col items-center gap-3 border border-pink-100 h-fit">
                      <h3 className="text-pink-500 font-bold text-xs uppercase tracking-widest">Background</h3>
                      <div className="flex flex-wrap justify-center gap-3">
                        {BACKGROUNDS.map(bg => (
                          <button
                            key={bg.id}
                            onClick={() => setSelectedBg(bg)}
                            className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${selectedBg.id === bg.id ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
                              }`}
                            style={{ backgroundColor: bg.previewColor }}
                            title={bg.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Frame Selection */}
                    <div className="flex-1 bg-white/90 backdrop-blur-sm p-5 rounded-3xl shadow-lg flex flex-col items-center gap-3 border border-pink-100 relative group h-fit">
                      <h3 className="text-pink-500 font-bold text-xs uppercase tracking-widest">Frame Style</h3>

                      {/* Frame Hover Preview Tooltip */}
                      {(hoveredFrame || selectedFrame) && (
                        <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-32 h-24 rounded-xl shadow-2xl border-4 transition-all duration-300 pointer-events-none z-20 overflow-hidden flex items-center justify-center
                          ${(hoveredFrame || selectedFrame).className} 
                          ${hoveredFrame ? 'opacity-100 scale-110 -translate-y-2' : 'opacity-0 scale-95 translate-y-2'}`}
                        >
                          <div className="bg-white/60 w-full h-full flex items-center justify-center p-2 text-center">
                            <span className="text-pink-400 text-[10px] font-bold uppercase leading-tight">
                              {(hoveredFrame || selectedFrame).name}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap justify-center gap-3">
                        {FRAMES.map(f => (
                          <button
                            key={f.id}
                            onMouseEnter={() => setHoveredFrame(f)}
                            onMouseLeave={() => setHoveredFrame(null)}
                            onClick={() => setSelectedFrame(f)}
                            className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${selectedFrame.id === f.id ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
                              }`}
                            style={{ backgroundColor: f.previewColor }}
                            title={f.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center gap-2">
                  <button
                    disabled={isCapturing}
                    onClick={startPhotobooth}
                    className={`
                      px-12 py-5 rounded-full text-2xl font-bold shadow-xl transition-all
                      ${isCapturing
                        ? 'bg-pink-100 text-pink-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-500 to-rose-400 text-white hover:scale-105 active:scale-95'
                      }
                    `}
                  >
                    {isCapturing ? `Capturing ${photos.length + 1}/${MAX_PHOTOS}` : "Start Shooting!"}
                  </button>
                  {!isCapturing && (
                    <span className={`text-sm animate-pulse transition-colors ${isDarkBg ? 'text-pink-200' : 'text-pink-400'}`}>4 frames • 3s timer</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <PhotoStrip
              photos={photos}
              frame={selectedFrame}
              setFrame={setSelectedFrame}
              onReset={reset}
            />
          )}
        </main>

        <footer className={`mt-16 text-center text-sm transition-colors duration-500 ${isDarkBg ? 'text-pink-200' : 'text-pink-300'}`}>
        </footer>
      </div>
    </div>
  );
}
