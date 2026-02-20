import { Injectable, signal, computed, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase.config';
import { StorageService } from './storage.service';
import { AuthUser, SubscriptionState, SubscriptionTier } from '../models/auth.model';

const STORE = 'auth';
const SESSION_KEY = 'session';
const SUB_KEY = 'subscription';
const GRACE_DAYS = 7;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(StorageService);
  private readonly supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _subscription = signal<SubscriptionState>({
    tier: 'free',
    validUntil: null,
    checkedAt: 0,
  });

  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly subscription = this._subscription.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isPro = computed(() => {
    const sub = this._subscription();
    if (sub.tier !== 'pro') return false;
    if (sub.validUntil === null) return false;
    const graceMs = GRACE_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() < sub.validUntil + graceMs;
  });

  async initialize(): Promise<void> {
    const cached = await this.storage.get<{ access_token: string; refresh_token: string }>(STORE, SESSION_KEY);
    if (cached) {
      const { data } = await this.supabase.auth.setSession(cached);
      if (data.user) {
        this._user.set({ id: data.user.id, email: data.user.email ?? '' });
      }
    }
    const sub = await this.storage.get<SubscriptionState>(STORE, SUB_KEY);
    if (sub) this._subscription.set(sub);
    if (this._user()) {
      await this.refreshSubscription();
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (data.user && data.session) {
        this._user.set({ id: data.user.id, email: data.user.email ?? '' });
        await this.storage.set(STORE, SESSION_KEY, {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        await this.refreshSubscription();
      }
    } catch (err) {
      this._error.set(String(err));
    } finally {
      this._isLoading.set(false);
    }
  }

  async signUp(email: string, password: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const { data, error } = await this.supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      if (data.user) {
        this._error.set('Check your email to confirm your account.');
      }
    } catch (err) {
      this._error.set(String(err));
    } finally {
      this._isLoading.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this._user.set(null);
    this._subscription.set({ tier: 'free', validUntil: null, checkedAt: Date.now() });
    await this.storage.remove(STORE, SESSION_KEY);
    await this.storage.remove(STORE, SUB_KEY);
  }

  async refreshSubscription(): Promise<void> {
    const userId = this._user()?.id;
    if (!userId) return;
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('tier, valid_until')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return;
      const rawTier = data?.tier;
      const tier: SubscriptionTier = rawTier === 'pro' ? 'pro' : 'free';
      const state: SubscriptionState = {
        tier,
        validUntil: data?.valid_until ? new Date(data.valid_until).getTime() : null,
        checkedAt: Date.now(),
      };
      this._subscription.set(state);
      await this.storage.set(STORE, SUB_KEY, state);
    } catch (err) {
      this._error.set(String(err));
    }
  }
}
