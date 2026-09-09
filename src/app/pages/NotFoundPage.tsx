import { Link } from 'react-router';
import { Button } from '@/shared/ui';
import { useT } from '@/shared/i18n';

export function NotFoundPage() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-ink-500">404</p>
      <p className="text-mist">{t('pages.notFound')}</p>
      <Link to="/">
        <Button variant="secondary">{t('common.home')}</Button>
      </Link>
    </div>
  );
}
