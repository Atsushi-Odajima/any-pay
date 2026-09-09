export function ConfigErrorPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">Supabase の設定が必要です</h1>
      <p className="text-sm text-mist">
        <code className="text-lime">.env</code> に <code>VITE_SUPABASE_URL</code> と{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> を設定してください。手順は README を参照。
      </p>
      <pre className="overflow-x-auto rounded-xl bg-ink-800 p-3 text-xs text-mist">
        {`cp .env.example .env\n# Supabase ダッシュボード → Project Settings → API の値を貼り付け`}
      </pre>
    </div>
  );
}
