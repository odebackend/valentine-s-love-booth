
export interface CapturedPhoto {
  id: string;
  dataUrl: string;
}

export interface FrameOption {
  id: string;
  name: string;
  className: string;
  previewColor: string;
}

export interface BackgroundOption {
  id: string;
  name: string;
  className: string;
  previewColor: string;
}

export interface LoveNote {
  message: string;
  auraColor: string;
  compatibilityScore?: number;
}
