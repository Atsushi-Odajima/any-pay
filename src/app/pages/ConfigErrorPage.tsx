import { useT } from '@/shared/i18n';

export function ConfigErrorPage() {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-bold">{t('pages.configTitle')}</h1>
      <p className="text-sm text-muted">
        <code className="text-brand">.env</code> {t('pages.configLead')}
      </p>
      <pre className="overflow-x-auto rounded-xl bg-surface p-3 text-xs text-muted">
        {`cp .env.example .env\n# Supabase → Project Settings → API`}
      </pre>
    </div>
  );
}
