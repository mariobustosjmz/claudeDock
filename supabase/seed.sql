-- =============================================================================
-- DevDock Dev Seed — default Pro user for local/staging testing
-- Run this AFTER applying supabase-schema.sql
-- =============================================================================

-- Fixed UUID so subscriptions FK always matches
DO $$
DECLARE
  dev_user_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid;
BEGIN

  -- ── 1. Auth user ────────────────────────────────────────────────────────────
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud
  ) VALUES (
    dev_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'mariobustosjmz@gmail.com',
    crypt('mariobustosjmz@gmail.com', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;

  -- ── 2. Auth identity (required for email sign-in) ───────────────────────────
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    dev_user_id,
    dev_user_id,
    jsonb_build_object('sub', dev_user_id::text, 'email', 'mariobustosjmz@gmail.com'),
    'email',
    now(),
    now(),
    now()
  ) ON CONFLICT (provider, id) DO NOTHING;

  -- ── 3. Pro subscription ──────────────────────────────────────────────────────
  INSERT INTO public.subscriptions (
    user_id,
    tier,
    valid_until,
    created_at,
    updated_at
  ) VALUES (
    dev_user_id,
    'pro',
    now() + interval '1 year',
    now(),
    now()
  ) ON CONFLICT (user_id) DO UPDATE SET
    tier        = 'pro',
    valid_until = now() + interval '1 year',
    updated_at  = now();

END $$;
