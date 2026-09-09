import { Link } from 'react-router';
import { Button } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-ink-500">404</p>
      <p className="text-mist">ページが見つかりません</p>
      <Link to="/">
        <Button variant="secondary">ホームへ戻る</Button>
      </Link>
    </div>
  );
}
