import { Injectable } from '@angular/core';
import { Store } from '@tauri-apps/plugin-store';
import { AppError } from '../models/app-error.model';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storeCache = new Map<string, Store>();

  private async getStore(storeName: string): Promise<Store> {
    if (!this.storeCache.has(storeName)) {
      const store = await Store.load(`${storeName}.json`);
      this.storeCache.set(storeName, store);
    }
    return this.storeCache.get(storeName)!;
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    try {
      const store = await this.getStore(storeName);
      return (await store.get<T>(key)) ?? null;
    } catch (err) {
      throw new AppError(`Storage get failed for key "${key}"`, 'STORAGE_GET_ERROR', err);
    }
  }

  async set<T>(storeName: string, key: string, value: T): Promise<void> {
    try {
      const store = await this.getStore(storeName);
      await store.set(key, value);
    } catch (err) {
      throw new AppError(`Storage set failed for key "${key}"`, 'STORAGE_SET_ERROR', err);
    }
  }

  async remove(storeName: string, key: string): Promise<void> {
    try {
      const store = await this.getStore(storeName);
      await store.delete(key);
    } catch (err) {
      throw new AppError(`Storage remove failed for key "${key}"`, 'STORAGE_REMOVE_ERROR', err);
    }
  }
}
