// Stripe webhook: checkout.session.completed → charge_wallet_for（service_role）
//   冪等キー = Checkout Session id。webhook が再送されても二重計上されない。
// secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY（自動注入）
// デプロイ時は `supabase functions deploy stripe-webhook --no-verify-jwt`（Stripe は JWT を付けない）
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', webhookSecret);
  } catch (e) {
    console.error('signature verification failed', e);
    return new Response('invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? session.metadata?.user_id;
    const amount = session.amount_total; // JPY は 0 小数通貨なので円
    if (!userId || !amount || session.payment_status !== 'paid') {
      return new Response('ignored', { status: 200 });
    }
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await admin.rpc('charge_wallet_for', {
      p_user_id: userId,
      p_amount: amount,
      p_method: 'stripe',
      p_idempotency_key: session.id,
      p_metadata: { stripe_session_id: session.id, stripe_payment_intent: session.payment_intent },
    });
    if (error) {
      console.error('charge_wallet_for failed', error);
      // LIMIT_EXCEEDED などは再送しても解決しないので 200 で握りつぶし、ログに残す
      return new Response(`charge failed: ${error.message}`, { status: 200 });
    }
  }
  return new Response('ok', { status: 200 });
});
