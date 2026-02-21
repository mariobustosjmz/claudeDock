export interface AnnotationMarker {
  x: number;
  y: number;
  label: number;
}

export interface ScreenshotEntry {
  id: string;
  imageBase64: string;
  width: number;
  height: number;
  x: number;
  y: number;
  capturedAt: number;
  annotations?: AnnotationMarker[];
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
