import type { ReactNode } from 'react';
import { ShieldCheck, Store, User } from 'lucide-react';
import { Card, ListRow, PageHeader } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { useManuals, type ManualId } from '../content';

const ICON: Record<ManualId, ReactNode> = {
  user: <User className="h-5 w-5" />,
  merchant: <Store className="h-5 w-5" />,
  admin: <ShieldCheck className="h-5 w-5" />,
};

export function GuideIndexPage() {
  const t = useT();
  const manuals = useManuals();
  return (
    <>
      <PageHeader title={t('guide.title')} back="/more" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <p className="text-sm text-mist">{t('guide.lead')}</p>
        <Card className="p-0">
          {manuals.map((m) => (
            <ListRow
              key={m.id}
              icon={ICON[m.id]}
              title={m.title}
              subtitle={m.subtitle}
              to={`/guide/${m.id}`}
            />
          ))}
        </Card>
        <p className="text-xs text-ink-400">{t('guide.printHint')}</p>
      </div>
    </>
  );
}
