import React, { useState, useEffect, useCallback } from 'react';
import { CameraView } from './components/CameraView';
import { PhotoStrip } from './components/PhotoStrip';
import { FRAMES, BACKGROUNDS, HEART_ICON, STICKERS, STICKER_BACKGROUNDS, STICKER_FRAMES, ALL_FRAMES, ALL_BACKGROUNDS } from './constants';
import { CapturedPhoto, FrameOption, BackgroundOption, StickerOption } from './types';

const MAX_PHOTOS = 4;
const INITIAL_COUNTDOWN = 3;

const BackgroundParticles = React.memo(() => {
  const particles = React.useMemo(() => {
    return [...Array(15)].map((_, i) => ({
      left: `${Math.random() * 100}%`,
      duration: `${15 + Math.random() * 10}s`,
      drift: `${(Math.random() - 0.5) * 200}`,
      delay: `${Math.random() * 10}s`,
      size: `${1 + Math.random() * 1.5}rem`,
      emoji: ['❤️', '💖', '💗', '💕', '🌸'][i % 5]
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="heart-particle"
          style={{
            left: p.left,
            '--duration': p.duration,
            '--drift': p.drift,
            animationDelay: p.delay,
            fontSize: p.size,
          } as any}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
});

export default function App() {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameOption>(ALL_FRAMES[0]);
  const [selectedBg, setSelectedBg] = useState<BackgroundOption>(ALL_BACKGROUNDS[0]);
  const [selectedStickers, setSelectedStickers] = useState<StickerOption[]>([]);
  const [stickerStyle, setStickerStyle] = useState<'single' | 'burst' | 'chaos' | 'border' | 'corners'>('single');
  const [stripCaption, setStripCaption] = useState('Valentine 2026');

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
      })
      .catch(err => {
        console.error('Failed to process photo:', err);
        setIsCapturing(false);
      });
  }, []);



  const reset = () => {
    photos.forEach(p => URL.revokeObjectURL(p.dataUrl));
    setPhotos([]);
    setIsCapturing(false);
    setCountdown(null);
  };

  const isDarkBg = selectedBg.id === 'starlight';

  // Memoize background style to prevent re-renders
  const backgroundStyle = React.useMemo(() => {
    if (!selectedBg.imageUrl) return {};
    return {
      backgroundImage: `url(${selectedBg.imageUrl})`,
      backgroundSize: selectedBg.id.startsWith('bg-sticker') ? '80px 80px' : 'cover',
      backgroundRepeat: selectedBg.id.startsWith('bg-sticker') ? 'repeat' : 'no-repeat',
      backgroundAttachment: 'fixed'
    };
  }, [selectedBg.imageUrl, selectedBg.id]);

  return (
    <div
      className={`min-h-screen py-8 px-4 overflow-x-hidden transition-all duration-700 relative flex flex-col items-center justify-center ${selectedBg.className}`}
      style={backgroundStyle}
    >
      <BackgroundParticles />

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="text-center mb-6 md:mb-10">
          <h1 className={`text-4xl sm:text-5xl md:text-7xl font-pacifico drop-shadow-sm mb-2 md:mb-4 transition-colors duration-500 ${isDarkBg ? 'text-pink-300' : 'text-pink-500'}`}>
            Love Booth
          </h1>
          <p className={`font-bold text-[10px] sm:text-xs md:text-sm tracking-[0.2em] flex items-center justify-center gap-2 transition-colors duration-500 ${isDarkBg ? 'text-pink-200' : 'text-pink-400'}`}>
            <span>CAPTURE YOUR VALENTINE MEMORIES</span>
            <span className="text-pink-300 animate-pulse">{HEART_ICON}</span>
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
                stickerStyle={stickerStyle}
                frame={selectedFrame}
                background={selectedBg}
              />

              <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                  {/* Atmosphere / Background Selection */}
                  {!isCapturing && (
                    <div className="glass-card p-4 sm:p-5 rounded-3xl flex flex-col items-center gap-3 h-fit">
                      <h3 className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Atmosphere</h3>
                      <div className="flex flex-wrap justify-center gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                        {ALL_BACKGROUNDS.map(bg => {
                          const isSelected = selectedBg.id === bg.id;
                          const bgStyle = bg.imageUrl ? { 
                            backgroundImage: `url(${bg.imageUrl})`, 
                            backgroundSize: 'contain', 
                            backgroundRepeat: 'no-repeat', 
                            backgroundPosition: 'center', 
                            backgroundColor: '#fff' 
                          } : {};
                          
                          return (
                            <button
                              key={bg.id}
                              onClick={() => setSelectedBg(bg)}
                              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl border-2 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden shadow-sm ${isSelected ? 'border-pink-500 scale-105 ring-2 ring-pink-100' : 'border-white/50'}`}
                              title={bg.name}
                            >
                              <div
                                className={`w-full h-full ${bg.className} flex items-center justify-center pointer-events-none`}
                                style={bgStyle}
                              >
                                {!bg.imageUrl && <span className="text-lg">{bg.icon}</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Frame Selection */}
                  {!isCapturing && (
                    <div className="glass-card p-4 sm:p-5 rounded-3xl flex flex-col items-center gap-3 h-fit">
                      <h3 className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Frame Style</h3>
                      <div className="flex flex-wrap justify-center gap-2.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                        {ALL_FRAMES.map(f => {
                          const isSelected = selectedFrame.id === f.id;
                          const frameStyle = f.imageUrl
                            ? { backgroundImage: `url(${f.imageUrl})`, backgroundSize: 'cover' }
                            : { backgroundColor: f.previewColor };
                          
                          return (
                            <button
                              key={f.id}
                              onClick={() => setSelectedFrame(f)}
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-transform hover:scale-105 active:scale-95 overflow-hidden ${isSelected ? 'border-pink-500 scale-105 ring-2 ring-pink-100' : 'border-gray-200'}`}
                              style={frameStyle}
                              title={f.name}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sticker Selection - ALWAYS SHOW in the same place */}
                  <div className={`glass-card p-4 sm:p-5 rounded-3xl flex flex-col items-center gap-3 h-fit ${isCapturing ? 'md:col-start-2' : ''}`}>
                    <div className="flex flex-col items-center gap-1">
                      <h3 className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Decorations</h3>
                      {/* Sticker Density Toggle */}
                      <div className="flex bg-pink-100/50 p-0.5 rounded-full mb-1 flex-wrap justify-center gap-1 max-w-[180px]">
                        {[
                          { id: 'single', label: 'Classic' },
                          { id: 'burst', label: 'Burst' },
                          { id: 'chaos', label: 'Chaos' },
                          { id: 'border', label: 'Border' },
                          { id: 'corners', label: 'Corners' }
                        ].map(s => (
                          <button
                            key={s.id}
                            onClick={() => setStickerStyle(s.id as any)}
                            className={`px-2 py-0.5 rounded-full text-[7px] font-bold uppercase transition-all ${stickerStyle === s.id ? 'bg-pink-500 text-white shadow-sm' : 'text-pink-400 hover:bg-pink-100'}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
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
              stickerStyle={stickerStyle}
              setStickerStyle={setStickerStyle}
              stripCaption={stripCaption}
              setStripCaption={setStripCaption}
              background={selectedBg}
              setBackground={setSelectedBg}
            />
          )}
        </main>

        <footer className={`mt-16 text-center text-sm transition-colors duration-500 ${isDarkBg ? 'text-pink-200' : 'text-pink-300'}`}>
        </footer>
      </div>
    </div>
  );
}
