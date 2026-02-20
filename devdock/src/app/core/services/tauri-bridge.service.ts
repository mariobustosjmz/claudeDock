import { Injectable } from '@angular/core';
import { invoke as tauriInvoke, InvokeArgs } from '@tauri-apps/api/core';
import { AppError } from '../models/app-error.model';

@Injectable({ providedIn: 'root' })
export class TauriBridgeService {
  async invoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
    try {
      return await tauriInvoke<T>(cmd, args);
    } catch (err) {
      throw new AppError(
        `Tauri command "${cmd}" failed: ${String(err)}`,
        'TAURI_INVOKE_ERROR',
        err,
      );
    }
  }
}
