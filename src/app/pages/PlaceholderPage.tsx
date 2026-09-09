import { PageHeader } from '@/shared/ui';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="p-6 text-sm text-mist">準備中</div>
    </>
  );
}
