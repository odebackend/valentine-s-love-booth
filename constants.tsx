
import React from 'react';
import { FrameOption, BackgroundOption, StickerOption } from './types';

export const FRAMES: FrameOption[] = [
  { id: 'soft-pink', name: 'Sweet Pink', className: 'pattern-hearts border-pink-200', previewColor: '#FDF2F8' },
  { id: 'romantic-red', name: 'Passion Red', className: 'pattern-red-hearts border-red-200', previewColor: '#FEF2F2' },
  { id: 'lavender-love', name: 'Lavender Bliss', className: 'pattern-stars border-purple-200', previewColor: '#F5F3FF' },
  { id: 'classic-white', name: 'Classy White', className: 'pattern-minimal border-gray-100', previewColor: '#FFFFFF' },
];

export const BACKGROUNDS: BackgroundOption[] = [
  { id: 'gradient', name: 'Romantic Glow', className: 'bg-gradient-romantic', previewColor: '#ff9a9e', icon: '✨' },
  { id: 'hearts-fall', name: 'Falling Hearts', className: 'bg-hearts-fall', previewColor: '#ff85a1', icon: '💕' },
  { id: 'love-pulse', name: 'Love Pulse', className: 'bg-love-pulse', previewColor: '#fecaca', icon: '💗' },
  { id: 'starlight', name: 'Midnight Love', className: 'bg-starlight', previewColor: '#1a0b2e', icon: '🌟' },
  { id: 'bokeh', name: 'Soft Bokeh', className: 'bg-soft-bokeh', previewColor: '#fad0c4', icon: '🌸' },
];

// Automatically import all stickers from assets/stickers
const stickerFiles = (import.meta as any).glob('./assets/stickers/*.{png,jpg,jpeg,svg,webp}', { eager: true });

export const STICKERS: StickerOption[] = Object.entries(stickerFiles).map(([path, data]: [string, any]) => {
  const name = path.split('/').pop()?.split('.')[0] || 'Sticker';
  return {
    id: `sticker-${name}`,
    url: data.default || data,
    name: `Sticker ${name}`,
  };
});

// Create sticker-based background options
export const STICKER_BACKGROUNDS: BackgroundOption[] = STICKERS.map(s => ({
  id: `bg-${s.id}`,
  name: `${s.name} Pattern`,
  className: 'bg-sticker-pattern',
  previewColor: '#ffffff',
  imageUrl: s.url
}));

// Create sticker-based frame options
export const STICKER_FRAMES: FrameOption[] = STICKERS.map(s => ({
  id: `frame-${s.id}`,
  name: `${s.name} Border`,
  className: 'frame-sticker-border',
  previewColor: '#ffffff',
  imageUrl: s.url
}));

export const HEART_ICON = (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
