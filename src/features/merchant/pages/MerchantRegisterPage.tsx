import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { Store } from 'lucide-react';
import { Button, ErrorMessage, Input, PageHeader } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { useRegisterMerchant } from '../hooks';

const schema = z.object({
  name: z.string().trim().min(1, 'validation.storeName').max(60, 'validation.storeNameMax'),
  category: z.string().trim().max(30).optional(),
  address: z.string().trim().max(100).optional(),
});
type Form = z.infer<typeof schema>;

export function MerchantRegisterPage() {
  const t = useT();
  const navigate = useNavigate();
  const register = useRegisterMerchant();
  const form = useForm<Form>({ resolver: zodResolver(schema) });
  return (
    <>
      <PageHeader title={t('merchant.register.title')} back="/more" />
      <div className="flex flex-col gap-4 px-4">
        <div className="flex items-center gap-3 rounded-2xl bg-ink-800 p-4 text-sm text-mist">
          <Store className="h-6 w-6 shrink-0 text-lime" />
          {t('merchant.register.lead')}
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
            label={t('merchant.register.name')}
            placeholder={t('merchant.register.namePlaceholder')}
            autoFocus
            error={t(form.formState.errors.name?.message)}
            {...form.register('name')}
          />
          <Input
            label={t('merchant.register.category')}
            placeholder={t('merchant.register.categoryPlaceholder')}
            error={t(form.formState.errors.category?.message)}
            {...form.register('category')}
          />
          <Input
            label={t('merchant.register.address')}
            placeholder={t('merchant.register.addressPlaceholder')}
            error={t(form.formState.errors.address?.message)}
            {...form.register('address')}
          />
          <ErrorMessage error={register.error} />
          <Button type="submit" size="lg" full loading={register.isPending}>
            {t('merchant.register.submit')}
          </Button>
        </form>
      </div>
    </>
  );
}
