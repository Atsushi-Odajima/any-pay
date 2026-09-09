import { Navigate, useParams } from 'react-router';
import { Printer } from 'lucide-react';
import { Button, PageHeader } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { printPage } from '@/shared/platform/print';
import { isManualId, useManuals } from '../content';
import { ManualBlock } from '../components/ManualBlock';

export function GuidePage() {
  const t = useT();
  const { id } = useParams();
  const manuals = useManuals();
  const manual = isManualId(id) ? manuals.find((m) => m.id === id) : undefined;
  if (!manual) return <Navigate to="/guide" replace />;

  return (
    <>
      <PageHeader
        title={manual.title}
        back="/guide"
        right={
          <Button
            variant="ghost"
            size="sm"
            icon={<Printer className="h-4 w-4" />}
            onClick={printPage}
          >
            {t('guide.print')}
          </Button>
        }
      />
      <article className="print-doc px-4 pb-8">
        <h1 className="hidden text-2xl font-bold print:block">{manual.title}</h1>
        <p className="text-sm text-mist print:text-black">{manual.subtitle}</p>

        <nav aria-label={t('guide.toc')} className="mt-4 rounded-2xl bg-ink-800 p-4 print:hidden">
          <p className="mb-2 text-xs font-semibold text-mist">{t('guide.toc')}</p>
          <ol className="flex flex-col gap-1.5">
            {manual.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-lime">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {manual.sections.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className="mt-8 flex scroll-mt-16 flex-col gap-3 print:break-inside-avoid"
          >
            <h2 className="text-base font-bold print:text-black">
              <span className="mr-2 text-lime print:text-black">{i + 1}.</span>
              {s.title}
            </h2>
            {s.blocks.map((b, j) => (
              <ManualBlock key={`${s.id}-${j}`} block={b} />
            ))}
          </section>
        ))}

        <p className="mt-10 text-center text-xs text-ink-400 print:text-black">
          {t('guide.footer')}
        </p>
      </article>
    </>
  );
}
