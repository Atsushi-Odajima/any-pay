// 有効なプロバイダの一覧。secrets が設定されているものだけを公開する
import type { ChargeProvider, MethodSpec } from './types.ts';
import { sandboxProvider } from './providers/sandbox.ts';
import { stripeProvider } from './providers/stripe.ts';

export function providers(): ChargeProvider[] {
  const list: ChargeProvider[] = [];
  if (Deno.env.get('SANDBOX_API_KEY') && Deno.env.get('SANDBOX_WEBHOOK_SECRET'))
    list.push(sandboxProvider);
  if (Deno.env.get('STRIPE_SECRET_KEY') && Deno.env.get('STRIPE_WEBHOOK_SECRET'))
    list.push(stripeProvider);
  return list;
}

export function getProvider(id: string | undefined): ChargeProvider | undefined {
  return providers().find((p) => p.id === id);
}

export function listMethods(): MethodSpec[] {
  return providers().flatMap((p) => p.methods());
}
