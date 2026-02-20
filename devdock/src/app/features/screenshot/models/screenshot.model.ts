export interface ScreenshotEntry {
  id: string;
  imageBase64: string;
  width: number;
  height: number;
  x: number;
  y: number;
  capturedAt: number;
}

export interface CaptureResult {
  image_base64: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface ScreenRegion {
  startX: number;
  startY: number;
  width: number;
  height: number;
}
