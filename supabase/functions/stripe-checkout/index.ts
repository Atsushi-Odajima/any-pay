// Stripe Checkout Session（テストモード）を作成し、URL を返す。
// 呼び出し: supabase.functions.invoke('stripe-checkout', { body: { amount, origin } })（ユーザーの JWT 付き）
// secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY（自動注入）
import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'NOT_AUTHENTICATED' }, 401);
    }
    const { amount, origin } = (await req.json()) as { amount?: number; origin?: string };
    if (!Number.isInteger(amount) || amount! < 100 || amount! > 100_000) {
      return json({ error: 'INVALID_AMOUNT' }, 400);
    }
    const base = origin && /^https?:\/\//.test(origin) ? origin : (Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: userData.user.id,
      metadata: { user_id: userData.user.id, amount: String(amount) },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'jpy', // 0 小数通貨：unit_amount は円そのもの
            unit_amount: amount!,
            product_data: { name: 'Any Pay チャージ（デモ）' },
          },
        },
      ],
      success_url: `${base}/charge/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/charge`,
    });
    return json({ url: session.url, session_id: session.id });
  } catch (e) {
    console.error(e);
    return json({ error: 'CHECKOUT_FAILED' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
