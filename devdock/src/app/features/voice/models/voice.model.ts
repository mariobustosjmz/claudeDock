export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'done';

export interface AudioResult {
  wav_base64: string;
  duration_seconds: number;
  sample_rate: number;
}
