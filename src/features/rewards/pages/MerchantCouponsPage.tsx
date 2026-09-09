import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Ticket } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  ListRow,
  PageLoading,
  Segmented,
  Sheet,
  toast,
} from '@/shared/ui';
import { formatDate } from '@/shared/lib/date';
import { useMerchantContext } from '@/features/merchant/hooks';
import { describeDiscount } from '../discount';
import { useCreateMerchantCoupon, useDeleteCoupon, useMerchantCoupons } from '../hooks';

const schema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力').max(40),
  value: z.coerce.number().int().min(1, '1以上'),
  minAmount: z.coerce.number().int().min(0),
  days: z.coerce.number().int().min(1, '1日以上').max(365),
  maxUses: z.coerce.number().int().min(0),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function validUntilFromDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function MerchantCouponsPage() {
  const { merchant } = useMerchantContext();
  const coupons = useMerchantCoupons(merchant.id);
  const create = useCreateMerchantCoupon();
  const remove = useDeleteCoupon();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'fixed' | 'percent'>('fixed');
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', value: 100, minAmount: 0, days: 30, maxUses: 0 },
  });

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <Button icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
        クーポンを作成
      </Button>
      {coupons.isPending ? (
        <PageLoading />
      ) : !coupons.data || coupons.data.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-10 w-10" />}
          title="クーポンはまだありません"
          description="作成するとお客様の「獲得する」一覧に表示されます"
        />
      ) : (
        <Card className="p-0">
          {coupons.data.map((c) => (
            <ListRow
              key={c.id}
              icon={<Ticket className="h-5 w-5" />}
              title={c.title}
              subtitle={`${describeDiscount(c)} · ${formatDate(c.valid_until)} まで${c.max_uses ? ` · 上限 ${c.max_uses} 枚` : ''}`}
              right={
                <button
                  type="button"
                  aria-label="削除"
                  className="rounded-full p-2 text-mist hover:bg-ink-700 hover:text-danger"
                  onClick={() =>
                    remove.mutate(c.id, { onSuccess: () => toast.success('削除しました') })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              }
              chevron={false}
            />
          ))}
        </Card>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="クーポンを作成">
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((v) =>
            create.mutate(
              {
                merchantId: merchant.id,
                title: v.title,
                discountType: type,
                value: v.value,
                minAmount: v.minAmount,
                validUntil: validUntilFromDays(v.days),
                maxUses: v.maxUses > 0 ? v.maxUses : null,
              },
              {
                onSuccess: () => {
                  toast.success('クーポンを作成しました');
                  setOpen(false);
                  form.reset();
                },
              },
            ),
          )}
        >
          <Input
            label="タイトル"
            placeholder="例：ドリンク 100円引き"
            error={form.formState.errors.title?.message}
            {...form.register('title')}
          />
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'fixed', label: '固定額（円引き）' },
              { value: 'percent', label: '割合（% OFF）' },
            ]}
          />
          <Input
            label={type === 'fixed' ? '割引額（円）' : '割引率（%）'}
            inputMode="numeric"
            max={type === 'percent' ? 100 : undefined}
            error={form.formState.errors.value?.message}
            {...form.register('value')}
          />
          <Input
            label="最低利用金額（円）"
            inputMode="numeric"
            error={form.formState.errors.minAmount?.message}
            {...form.register('minAmount')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="有効期間（日）"
              inputMode="numeric"
              error={form.formState.errors.days?.message}
              {...form.register('days')}
            />
            <Input
              label="配布上限（0=無制限）"
              inputMode="numeric"
              error={form.formState.errors.maxUses?.message}
              {...form.register('maxUses')}
            />
          </div>
          <ErrorMessage error={create.error} />
          <Button type="submit" full loading={create.isPending}>
            作成する
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
