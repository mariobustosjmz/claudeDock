import { Injectable, computed, inject, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AnalyticsService } from '../../core/services/analytics.service';
import { LlmService } from '../../core/services/llm.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { AudioResult, RecordingState } from './models/voice.model';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly analytics = inject(AnalyticsService);
  private readonly llm = inject(LlmService);
  private readonly permissions = inject(PermissionsService);

  private readonly _state = signal<RecordingState>('idle');
  private readonly _transcription = signal('');
  private readonly _lastError = signal<string | null>(null);
  private readonly _duration = signal<number | null>(null);
  private readonly _micDeviceName = signal<string | null>(null);

  readonly state = this._state.asReadonly();
  readonly transcription = this._transcription.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly duration = this._duration.asReadonly();
  readonly micDeviceName = this._micDeviceName.asReadonly();
  readonly isRecording = computed(() => this._state() === 'recording');
  readonly hasText = computed(() => this._transcription().trim().length > 0);

  constructor() {
    this.listenForStreamErrors();
  }

  async startRecording(): Promise<void> {
    this._lastError.set(null);

    const micGranted = await this.permissions.ensureMicrophone();
    if (!micGranted) {
      this._lastError.set('Microphone permission required. Please grant it in System Preferences → Privacy & Security.');
      return;
    }

    try {
      const deviceName = await invoke<string>('validate_microphone');
      this._micDeviceName.set(deviceName);
    } catch (err) {
      this._lastError.set(String(err));
      return;
    }

    this._state.set('recording');
    try {
      await invoke('start_recording');
    } catch (err) {
      this._state.set('idle');
      this._lastError.set(String(err));
    }
  }

  private listenForStreamErrors(): void {
    listen<string>('audio-error', (event) => {
      this._lastError.set(event.payload);
      if (this._state() === 'recording') {
        this._state.set('idle');
      }
    });
  }

  async stopAndTranscribe(): Promise<void> {
    if (this._state() !== 'recording') return;

    this._state.set('transcribing');
    try {
      const audioResult = await invoke<AudioResult>('stop_recording');
      this._duration.set(audioResult.duration_seconds);

      const text = await this.llm.transcribeAudio(audioResult.wav_base64);
      this._transcription.set(text);
      this._state.set('done');
      this.analytics.track('voice_transcribed', { duration_seconds: audioResult.duration_seconds });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this._lastError.set(message);
      this._state.set('idle');
    }
  }

  clearTranscription(): void {
    this._transcription.set('');
    this._state.set('idle');
    this._lastError.set(null);
    this._duration.set(null);
  }

  private async stopRecordingOnly(): Promise<void> {
    try {
      await invoke('stop_recording');
    } catch {
      // Recording stop failed — state already reset, safe to ignore
    }
    this._state.set('idle');
  }
}
