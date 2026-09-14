import { Link } from 'react-router';
import { Logo } from './Logo';

/** 全画面の左上に出すブランドバー（ロゴ + ワードマーク）。セーフエリア分の余白もここで確保する */
export function BrandBar() {
  return (
    <div
      className="sticky top-0 z-30 bg-canvas/95 backdrop-blur no-print"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="flex h-11 items-center px-4">
        <Link to="/" aria-label="Any Pay" className="inline-flex items-center">
          <Logo size={24} />
        </Link>
      </div>
    </div>
  );
}
