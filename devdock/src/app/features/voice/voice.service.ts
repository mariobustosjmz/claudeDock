import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from '../settings/settings.service';
import { AudioResult, RecordingState } from './models/voice.model';

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(SettingsService);

  private readonly _state = signal<RecordingState>('idle');
  private readonly _transcription = signal('');
  private readonly _lastError = signal<string | null>(null);
  private readonly _duration = signal<number | null>(null);

  readonly state = this._state.asReadonly();
  readonly transcription = this._transcription.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly duration = this._duration.asReadonly();
  readonly isRecording = computed(() => this._state() === 'recording');
  readonly hasText = computed(() => this._transcription().trim().length > 0);

  async startRecording(): Promise<void> {
    this._lastError.set(null);
    this._state.set('recording');
    try {
      await invoke('start_recording');
    } catch (err) {
      this._state.set('idle');
      this._lastError.set(String(err));
    }
  }

  async stopAndTranscribe(): Promise<void> {
    if (this._state() !== 'recording') return;

    const apiKey = this.getOpenAiKey();
    if (!apiKey) {
      this._lastError.set('OpenAI API key not configured. Set it in Settings.');
      await this.stopRecordingOnly();
      return;
    }

    this._state.set('transcribing');
    try {
      const audioResult = await invoke<AudioResult>('stop_recording');
      this._duration.set(audioResult.duration_seconds);

      const text = await this.transcribeAudio(audioResult.wav_base64, apiKey);
      this._transcription.set(text);
      this._state.set('done');
    } catch (err) {
      this._lastError.set(String(err));
      this._state.set('idle');
    }
  }

  clearTranscription(): void {
    this._transcription.set('');
    this._state.set('idle');
    this._lastError.set(null);
    this._duration.set(null);
  }

  private getOpenAiKey(): string | undefined {
    const key = this.settings.settings().apiKeys['openai'];
    return key || undefined;
  }

  private async stopRecordingOnly(): Promise<void> {
    try {
      await invoke('stop_recording');
    } catch {
      // Recording stop failed — state already reset, safe to ignore
    }
    this._state.set('idle');
  }

  private async transcribeAudio(wavBase64: string, apiKey: string): Promise<string> {
    const binaryStr = atob(wavBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', blob, 'recording.wav');
    formData.append('model', 'whisper-1');

    // Do NOT set Content-Type — browser must set it with boundary for multipart/form-data
    const headers = new HttpHeaders({ Authorization: `Bearer ${apiKey}` });

    const response = await firstValueFrom(
      this.http.post<{ text: string }>(WHISPER_URL, formData, { headers })
    );

    return response.text;
  }
}
