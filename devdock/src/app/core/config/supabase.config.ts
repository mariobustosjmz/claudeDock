export const SUPABASE_URL: string =
  (import.meta as { env?: Record<string, string> }).env?.['VITE_SUPABASE_URL'] ?? '';

export const SUPABASE_ANON_KEY: string =
  (import.meta as { env?: Record<string, string> }).env?.['VITE_SUPABASE_ANON_KEY'] ?? '';

export const STRIPE_CHECKOUT_URL: string =
  (import.meta as { env?: Record<string, string> }).env?.['VITE_STRIPE_CHECKOUT_URL'] ?? '';

if (typeof window !== 'undefined' && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  throw new Error('[DevDock] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}
