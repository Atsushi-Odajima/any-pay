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
import { useT } from '@/shared/i18n';
import { describeDiscount } from '../discount';
import { useCreateMerchantCoupon, useDeleteCoupon, useMerchantCoupons } from '../hooks';

const schema = z.object({
  title: z.string().trim().min(1, 'validation.couponTitle').max(40),
  value: z.coerce.number().int().min(1, 'validation.min1'),
  minAmount: z.coerce.number().int().min(0),
  days: z.coerce.number().int().min(1, 'validation.days').max(365),
  maxUses: z.coerce.number().int().min(0),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function validUntilFromDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function MerchantCouponsPage() {
  const t = useT();
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
        {t('coupons.merchant.create')}
      </Button>
      {coupons.isPending ? (
        <PageLoading />
      ) : !coupons.data || coupons.data.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-10 w-10" />}
          title={t('coupons.merchant.empty')}
          description={t('coupons.merchant.emptySub')}
        />
      ) : (
        <Card className="p-0">
          {coupons.data.map((c) => (
            <ListRow
              key={c.id}
              icon={<Ticket className="h-5 w-5" />}
              title={c.title}
              subtitle={`${describeDiscount(c)} · ${t('coupons.until', { date: formatDate(c.valid_until) })}${
                c.max_uses ? ` · ${t('coupons.merchant.limit', { n: c.max_uses })}` : ''
              }`}
              right={
                <button
                  type="button"
                  aria-label={t('common.delete')}
                  className="rounded-full p-2 text-mist hover:bg-ink-700 hover:text-danger"
                  onClick={() =>
                    remove.mutate(c.id, {
                      onSuccess: () => toast.success(t('coupons.merchant.deleted')),
                    })
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

      <Sheet open={open} onClose={() => setOpen(false)} title={t('coupons.merchant.create')}>
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
                  toast.success(t('coupons.merchant.created'));
                  setOpen(false);
                  form.reset();
                },
              },
            ),
          )}
        >
          <Input
            label={t('coupons.merchant.title')}
            placeholder={t('coupons.merchant.titlePlaceholder')}
            error={t(form.formState.errors.title?.message)}
            {...form.register('title')}
          />
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'fixed', label: t('coupons.merchant.fixed') },
              { value: 'percent', label: t('coupons.merchant.percent') },
            ]}
          />
          <Input
            label={type === 'fixed' ? t('coupons.merchant.value') : t('coupons.merchant.rate')}
            inputMode="numeric"
            max={type === 'percent' ? 100 : undefined}
            error={t(form.formState.errors.value?.message)}
            {...form.register('value')}
          />
          <Input
            label={t('coupons.merchant.min')}
            inputMode="numeric"
            error={t(form.formState.errors.minAmount?.message)}
            {...form.register('minAmount')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('coupons.merchant.days')}
              inputMode="numeric"
              error={t(form.formState.errors.days?.message)}
              {...form.register('days')}
            />
            <Input
              label={t('coupons.merchant.maxUses')}
              inputMode="numeric"
              error={t(form.formState.errors.maxUses?.message)}
              {...form.register('maxUses')}
            />
          </div>
          <ErrorMessage error={create.error} />
          <Button type="submit" full loading={create.isPending}>
            {t('coupons.merchant.submit')}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
