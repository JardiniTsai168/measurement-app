export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CardDetection {
  rect: Rect;
  confidence: number;
  pixelsPerCm: number; // derived from rect width / 8.5
}

export interface Measurement {
  id: string;
  timestamp: number;
  imageDataUrl: string;
  cardRect: Rect;
  headPoint: Point;
  tailPoint: Point;
  lengthCm: number;
  widthCm?: number;
  widthStart?: Point;
  widthEnd?: Point;
  gpsLat?: number;
  gpsLng?: number;
  weather?: {
    temp: number;
    humidity: number;
    windSpeed: number;
    description: string;
  };
}

export type AppStep = 'home' | 'camera' | 'edit-card' | 'edit-object' | 'result' | 'history';

export interface CvModule {
  Mat: any;
  MatVector: any;
  Size: any;
  Point: any;
  cvtColor: (src: any, dst: any, code: number) => void;
  GaussianBlur: (src: any, dst: any, size: any, sigma: number) => void;
  Canny: (src: any, dst: any, t1: number, t2: number) => void;
  findContours: (src: any, contours: any, hierarchy: any, mode: number, method: number) => void;
  contourArea: (contour: any) => number;
  approxPolyDP: (curve: any, approxCurve: any, epsilon: number, closed: boolean) => void;
  boundingRect: (contour: any) => any;
  arcLength: (curve: any, closed: boolean) => number;
  COLOR_RGBA2GRAY: number;
  COLOR_BGR2GRAY: number;
  RETR_EXTERNAL: number;
  RETR_LIST: number;
  CHAIN_APPROX_SIMPLE: number;
  CHAIN_APPROX_NONE: number;
  imread: (canvas: HTMLCanvasElement) => any;
}

declare global {
  interface Window {
    cv: CvModule & {
      onRuntimeInitialized?: () => void;
    };
  }
}
