-- Run this in Supabase SQL Editor after creating your project

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  valid_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Auto-create free subscription on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (user_id, tier)
  values (new.id, 'free');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
