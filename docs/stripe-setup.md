# Stripe & Supabase Setup Guide

## Prerequisites
- Supabase project created at https://supabase.com
- Stripe account at https://stripe.com

## 1. Supabase Configuration

Update `devdock/.env` with your real values:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard
```

Run the SQL in Supabase SQL Editor to create the subscriptions table:
See `docs/supabase-schema.sql`

## 2. Stripe Products Setup

1. Go to Stripe Dashboard → Products → Add Product
2. Name: "DevDock Pro"
3. Add two prices:
   - Monthly: $5.33/month (recurring)
   - Annual: $48/year (recurring)
4. Create Payment Links for each price
5. Copy the Payment Link URL into `devdock/.env`:
   ```
   VITE_STRIPE_CHECKOUT_URL=https://buy.stripe.com/YOUR_LINK
   ```

## 3. Deploy Stripe Webhook

1. Install Supabase CLI: `npm install -g supabase`
2. Link project: `supabase link --project-ref YOUR_PROJECT_REF`
3. Set secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. Deploy function:
   ```bash
   supabase functions deploy stripe-webhook
   ```
5. In Stripe Dashboard → Webhooks → Add endpoint:
   - URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

## 4. Test the Flow

1. Run `pnpm tauri dev`
2. Click Account → Create Account
3. Confirm email in Supabase Auth dashboard
4. Sign In
5. Click "Upgrade to Pro" — Stripe opens in browser
6. Complete test payment with card `4242 4242 4242 4242`
7. Return to app, click "Refresh subscription status"
8. Badge should show "Pro"
