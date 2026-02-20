export const SUPABASE_URL: string =
  (import.meta as { env?: Record<string, string> }).env?.['VITE_SUPABASE_URL'] ?? '';

export const SUPABASE_ANON_KEY: string =
  (import.meta as { env?: Record<string, string> }).env?.['VITE_SUPABASE_ANON_KEY'] ?? '';

export const STRIPE_CHECKOUT_URL: string =
  (import.meta as { env?: Record<string, string> }).env?.['VITE_STRIPE_CHECKOUT_URL'] ?? '';

export const SUPABASE_CONFIGURED: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (typeof window !== 'undefined' && !SUPABASE_CONFIGURED) {
  console.warn('[DevDock] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY not set — auth disabled');
}
