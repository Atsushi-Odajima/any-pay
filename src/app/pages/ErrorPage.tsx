import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui';
import { reloadPage } from '@/shared/platform/print';

/** ルート配下で例外が起きたときの復帰画面（スタックトレースを出さない） */
export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : '不明なエラー';
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle className="h-8 w-8" />
      </span>
      <h1 className="text-xl font-bold">画面の表示中にエラーが起きました</h1>
      <p className="text-sm text-mist">
        再読み込みすると直ることがほとんどです。続く場合は下の内容を添えてお知らせください。
      </p>
      <pre className="max-w-full overflow-x-auto rounded-xl bg-ink-800 p-3 text-left text-xs text-mist">
        {message}
      </pre>
      <div className="flex w-full flex-col gap-2 pt-2">
        <Button full icon={<RefreshCw className="h-4 w-4" />} onClick={reloadPage}>
          再読み込み
        </Button>
        <Link to="/">
          <Button variant="secondary" full>
            ホームへ
          </Button>
        </Link>
      </div>
    </div>
  );
}
