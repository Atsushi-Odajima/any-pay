import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui';
import { reloadPage } from '@/shared/platform/print';
import { useT } from '@/shared/i18n';

/** ルート配下で例外が起きたときの復帰画面（スタックトレースを出さない） */
export function ErrorPage() {
  const error = useRouteError();
  const t = useT();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : t('pages.unknownError');
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle className="h-8 w-8" />
      </span>
      <h1 className="text-xl font-bold">{t('pages.errorTitle')}</h1>
      <p className="text-sm text-mist">{t('pages.errorLead')}</p>
      <pre className="max-w-full overflow-x-auto rounded-xl bg-ink-800 p-3 text-left text-xs text-mist">
        {message}
      </pre>
      <div className="flex w-full flex-col gap-2 pt-2">
        <Button full icon={<RefreshCw className="h-4 w-4" />} onClick={reloadPage}>
          {t('common.reload')}
        </Button>
        <Link to="/">
          <Button variant="secondary" full>
            {t('common.home')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
