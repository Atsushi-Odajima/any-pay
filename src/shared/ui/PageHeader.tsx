import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

interface Props {
  title: string;
  back?: boolean | string;
  right?: ReactNode;
}

export function PageHeader({ title, back, right }: Props) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 bg-ink/90 px-2 backdrop-blur no-print">
      {back ? (
        <button
          type="button"
          aria-label="戻る"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
      {right && <div className="pr-2">{right}</div>}
    </header>
  );
}
