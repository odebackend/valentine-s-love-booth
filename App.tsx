import React, { useState, useEffect, useCallback } from 'react';
import { CameraView } from './components/CameraView';
import { PhotoStrip } from './components/PhotoStrip';
import { FRAMES, BACKGROUNDS, HEART_ICON, STICKERS, STICKER_BACKGROUNDS, STICKER_FRAMES } from './constants';

const ALL_FRAMES = [...FRAMES, ...STICKER_FRAMES];
const ALL_BACKGROUNDS = [...BACKGROUNDS, ...STICKER_BACKGROUNDS];
import { CapturedPhoto, FrameOption, BackgroundOption, StickerOption } from './types';

const MAX_PHOTOS = 4;
const INITIAL_COUNTDOWN = 3;

export default function App() {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameOption>(ALL_FRAMES[0]);
  const [hoveredFrame, setHoveredFrame] = useState<FrameOption | null>(null);
  const [selectedBg, setSelectedBg] = useState<BackgroundOption>(ALL_BACKGROUNDS[0]);
  const [selectedStickers, setSelectedStickers] = useState<StickerOption[]>([]);

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
    <div
      className={`min-h-screen py-8 px-4 overflow-x-hidden transition-all duration-700 ${selectedBg.className}`}
      style={selectedBg.imageUrl ? { backgroundImage: `url(${selectedBg.imageUrl})` } : {}}
    >
      {/* Decorative Floating Hearts - only show on light backgrounds for contrast */}
      {!isDarkBg && (
        <>
          <div className="fixed top-10 left-10 text-pink-300 animate-float opacity-40 pointer-events-none">{HEART_ICON}</div>
          <div className="fixed bottom-20 right-10 text-pink-300 animate-float opacity-40 [animation-delay:1s] pointer-events-none">{HEART_ICON}</div>
          <div className="fixed top-1/2 left-5 text-pink-200 animate-float opacity-30 [animation-delay:1.5s] pointer-events-none">{HEART_ICON}</div>
        </>
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="text-center mb-6 md:mb-10">
          <h1 className={`text-4xl sm:text-5xl md:text-7xl font-pacifico drop-shadow-sm mb-2 md:mb-4 transition-colors duration-500 ${isDarkBg ? 'text-pink-300' : 'text-pink-500'}`}>
            Love Booth
          </h1>
          <p className={`font-bold text-[10px] sm:text-xs md:text-sm tracking-[0.2em] flex items-center justify-center gap-2 transition-colors duration-500 ${isDarkBg ? 'text-pink-200' : 'text-pink-400'}`}>
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
                selectedStickers={selectedStickers}
              />

              <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                  {/* Background Selection */}
                  {!isCapturing && (
                    <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-3xl shadow-lg flex flex-col items-center gap-3 border border-pink-100 h-fit">
                      <h3 className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Background</h3>
                      <div className="flex flex-wrap justify-center gap-2.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                        {ALL_BACKGROUNDS.map(bg => (
                          <button
                            key={bg.id}
                            onClick={() => setSelectedBg(bg)}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${selectedBg.id === bg.id ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
                              }`}
                            style={bg.imageUrl
                              ? { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'cover' }
                              : { backgroundColor: bg.previewColor }
                            }
                            title={bg.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frame Selection */}
                  {!isCapturing && (
                    <div className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl shadow-lg flex flex-col items-center gap-3 border border-pink-100 relative group h-fit">
                      <h3 className="text-pink-500 font-bold text-xs uppercase tracking-widest">Frame Style</h3>
                      <div className="flex flex-wrap justify-center gap-2.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                        {ALL_FRAMES.map(f => (
                          <button
                            key={f.id}
                            onMouseEnter={() => setHoveredFrame(f)}
                            onMouseLeave={() => setHoveredFrame(null)}
                            onClick={() => setSelectedFrame(f)}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${selectedFrame.id === f.id ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
                              }`}
                            style={f.imageUrl
                              ? { backgroundImage: `url(${f.imageUrl})`, backgroundSize: 'cover' }
                              : { backgroundColor: f.previewColor }
                            }
                            title={f.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sticker Selection - ALWAYS SHOW in the same place */}
                  <div className={`bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-3xl shadow-lg flex flex-col items-center gap-3 border border-pink-100 h-fit ${isCapturing ? 'md:col-start-2' : ''}`}>
                    <h3 className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Decorations</h3>
                    <div className="flex flex-wrap justify-center gap-2.5">
                      <button
                        onClick={() => setSelectedStickers([])}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${selectedStickers.length === 0 ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
                          }`}
                        title="Clear All"
                      >
                        <span className="text-[10px] text-gray-400">Clear</span>
                      </button>
                      {STICKERS.map(sticker => {
                        const isSelected = selectedStickers.some(s => s.id === sticker.id);
                        return (
                          <button
                            key={sticker.id}
                            onClick={() => {
                              setSelectedStickers(prev =>
                                isSelected
                                  ? prev.filter(s => s.id !== sticker.id)
                                  : [...prev, sticker]
                              );
                            }}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 overflow-hidden transition-all hover:scale-110 active:scale-95 ${isSelected ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
                              }`}
                            title={sticker.name}
                          >
                            <img src={sticker.url} className="w-full h-full object-contain p-1" alt={sticker.name} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

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
              selectedStickers={selectedStickers}
              setSelectedStickers={setSelectedStickers}
            />
          )}
        </main>

        <footer className={`mt-16 text-center text-sm transition-colors duration-500 ${isDarkBg ? 'text-pink-200' : 'text-pink-300'}`}>
        </footer>
      </div>
    </div>
  );
}
