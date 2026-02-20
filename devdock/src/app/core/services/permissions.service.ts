import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  async checkScreenRecording(): Promise<boolean> {
    try {
      return await invoke<boolean>('plugin:macos-permissions|check_screen_recording_permission');
    } catch {
      return true;
    }
  }

  async requestScreenRecording(): Promise<void> {
    try {
      await invoke<void>('plugin:macos-permissions|request_screen_recording_permission');
    } catch {
      // No-op on non-macOS or if already granted
    }
  }

  async checkMicrophone(): Promise<boolean> {
    try {
      return await invoke<boolean>('plugin:macos-permissions|check_microphone_permission');
    } catch {
      return true;
    }
  }

  async requestMicrophone(): Promise<void> {
    try {
      await invoke<void>('plugin:macos-permissions|request_microphone_permission');
    } catch {
      // No-op on non-macOS or if already granted
    }
  }

  async ensureScreenRecording(): Promise<boolean> {
    const granted = await this.checkScreenRecording();
    if (!granted) {
      await this.requestScreenRecording();
      return this.checkScreenRecording();
    }
    return true;
  }

  async ensureMicrophone(): Promise<boolean> {
    const granted = await this.checkMicrophone();
    if (!granted) {
      await this.requestMicrophone();
      return this.checkMicrophone();
    }
    return true;
  }
}
