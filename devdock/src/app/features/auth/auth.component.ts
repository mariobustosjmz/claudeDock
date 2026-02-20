import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { TauriBridgeService } from '../../core/services/tauri-bridge.service';
import { STRIPE_CHECKOUT_URL } from '../../core/config/supabase.config';

@Component({
  selector: 'app-auth',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-4 flex flex-col gap-4">
      @if (isLoggedIn()) {
        <div class="flex flex-col gap-3">
          <div class="text-xs font-semibold text-white/40 uppercase tracking-wider">Account</div>
          <p class="text-sm text-white">{{ user()?.email }}</p>
          <div class="flex items-center gap-2">
            <span
              class="px-2 py-0.5 rounded-full text-xs font-semibold"
              [class]="isPro() ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/50'"
            >
              {{ isPro() ? 'Pro' : 'Free' }}
            </span>
          </div>
          @if (!isPro()) {
            <button
              class="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
              (click)="upgrade()"
            >
              Upgrade to Pro — $4/mo
            </button>
          }
          <button
            class="text-xs text-white/30 hover:text-white/50 transition-colors"
            (click)="refreshSub()"
          >
            Refresh subscription status
          </button>
          <button
            class="w-full py-2 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 hover:text-white text-sm transition-all"
            (click)="signOut()"
          >
            Sign Out
          </button>
        </div>
      } @else {
        <div class="text-xs font-semibold text-white/40 uppercase tracking-wider">
          {{ isSignUp() ? 'Create Account' : 'Sign In' }}
        </div>
        <div class="flex flex-col gap-2">
          <input
            class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25"
            type="email"
            placeholder="Email"
            [value]="email()"
            (input)="onEmailInput($event)"
          />
          <input
            class="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25"
            type="password"
            placeholder="Password"
            [value]="password()"
            (input)="onPasswordInput($event)"
            (keydown.enter)="submit()"
          />
        </div>
        @if (error()) {
          <p class="text-xs" [class]="error()?.startsWith('Check') ? 'text-emerald-400' : 'text-red-400'">
            {{ error() }}
          </p>
        }
        <button
          class="w-full py-2 rounded-lg text-sm font-medium transition-all"
          [class]="isLoading() ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white'"
          [disabled]="isLoading()"
          (click)="submit()"
        >
          {{ isLoading() ? '…' : (isSignUp() ? 'Create Account' : 'Sign In') }}
        </button>
        <button
          class="text-xs text-white/40 hover:text-white/60 transition-colors"
          (click)="toggleMode()"
        >
          {{ isSignUp() ? 'Already have an account? Sign in' : 'No account? Create one' }}
        </button>
      }
    </div>
  `,
})
export class AuthComponent {
  private readonly authService = inject(AuthService);
  private readonly tauri = inject(TauriBridgeService);

  protected readonly isLoggedIn = this.authService.isLoggedIn;
  protected readonly isPro = this.authService.isPro;
  protected readonly user = this.authService.user;
  protected readonly isLoading = this.authService.isLoading;
  protected readonly error = this.authService.error;

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly isSignUp = signal(false);

  protected onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected toggleMode(): void {
    this.isSignUp.update(v => !v);
  }

  protected async submit(): Promise<void> {
    const e = this.email().trim();
    const p = this.password();
    if (!e || !p) return;
    if (this.isSignUp()) {
      await this.authService.signUp(e, p);
    } else {
      await this.authService.signIn(e, p);
    }
  }

  protected async signOut(): Promise<void> {
    await this.authService.signOut();
  }

  protected async upgrade(): Promise<void> {
    await this.tauri.invoke('open_url', { url: STRIPE_CHECKOUT_URL });
  }

  protected async refreshSub(): Promise<void> {
    await this.authService.refreshSubscription();
  }
}
