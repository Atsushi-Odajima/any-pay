// Edge Functions 共通：CORS / JSON レスポンス / エラー型
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/** クライアントに返すエラー。code は RPC と同じ大文字スネークケース（フロントの辞書で翻訳する） */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'HttpError';
  }
}

export function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

export function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return json({ error: e.code, message: e.message }, e.status);
  console.error(e);
  return json({ error: 'INTERNAL_ERROR' }, 500);
}

/** この Supabase プロジェクトの Edge Functions のベース URL（https://<ref>.supabase.co/functions/v1） */
export function functionsBaseUrl(): string {
  const base = Deno.env.get('SUPABASE_URL') ?? '';
  return `${base.replace(/\/$/, '')}/functions/v1`;
}

/** `/functions/v1/<name>/a/b` から `<name>` 以降のパス部分（['a','b']）を取り出す */
export function routeSegments(req: Request, fnName: string): string[] {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const i = parts.indexOf(fnName);
  return i === -1 ? parts : parts.slice(i + 1);
}

export function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\/[^\s]+$/.test(value);
}
