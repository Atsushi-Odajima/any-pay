// GET /charge-methods：利用できるチャージ方法（プロバイダ × 方式）の一覧
//   secrets の有無で決まる（サンドボックス / Stripe）。フロントはこの一覧からメニューを組み立てる
import { corsHeaders, errorResponse, json } from '../_shared/http.ts';
import { requireUser } from '../_shared/supabase.ts';
import { listMethods, providers } from '../_shared/gateway/registry.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    await requireUser(req);
    return json({
      methods: listMethods(),
      providers: providers().map((p) => p.id),
    });
  } catch (e) {
    return errorResponse(e);
  }
});
