import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { Store } from 'lucide-react';
import { Button, ErrorMessage, Input, PageHeader } from '@/shared/ui';
import { useRegisterMerchant } from '../hooks';

const schema = z.object({
  name: z.string().trim().min(1, '店舗名を入力してください').max(60, '60文字以内'),
  category: z.string().trim().max(30).optional(),
  address: z.string().trim().max(100).optional(),
});
type Form = z.infer<typeof schema>;

export function MerchantRegisterPage() {
  const navigate = useNavigate();
  const register = useRegisterMerchant();
  const form = useForm<Form>({ resolver: zodResolver(schema) });
  return (
    <>
      <PageHeader title="店舗登録" back="/more" />
      <div className="flex flex-col gap-4 px-4">
        <div className="flex items-center gap-3 rounded-2xl bg-ink-800 p-4 text-sm text-mist">
          <Store className="h-6 w-6 shrink-0 text-lime" />
          店舗を登録すると、決済の受付・売上管理・返金・静的QRの印刷ができます（デモ：審査なし）
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((v) =>
            register.mutate(
              { name: v.name, category: v.category || undefined, address: v.address || undefined },
              { onSuccess: () => navigate('/merchant', { replace: true }) },
            ),
          )}
        >
          <Input
            label="店舗名"
            placeholder="例：Any Coffee 渋谷店"
            autoFocus
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <Input
            label="カテゴリ（任意）"
            placeholder="例：カフェ"
            error={form.formState.errors.category?.message}
            {...form.register('category')}
          />
          <Input
            label="住所（任意）"
            placeholder="例：東京都渋谷区…"
            error={form.formState.errors.address?.message}
            {...form.register('address')}
          />
          <ErrorMessage error={register.error} />
          <Button type="submit" size="lg" full loading={register.isPending}>
            登録する
          </Button>
        </form>
      </div>
    </>
  );
}
