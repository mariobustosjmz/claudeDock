import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req: Request) => {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
    );
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${String(err)}`, { status: 400 });
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    const validUntil = new Date(sub.current_period_end * 1000).toISOString();

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (existing?.user_id) {
      await supabase
        .from('subscriptions')
        .update({
          tier: 'pro',
          stripe_subscription_id: sub.id,
          valid_until: validUntil,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', existing.user_id);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (existing?.user_id) {
      await supabase
        .from('subscriptions')
        .update({
          tier: 'free',
          valid_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', existing.user_id);
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string;
    const userEmail = session.customer_details?.email;

    if (userEmail) {
      const { data: authData } = await supabase.auth.admin.getUserByEmail(userEmail);
      if (authData?.user) {
        await supabase
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', authData.user.id);
      }
    }
  }

  return new Response('ok', { status: 200 });
});
