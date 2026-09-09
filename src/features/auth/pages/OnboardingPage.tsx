import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { AtSign } from 'lucide-react';
import { Button, ErrorMessage, Input, LanguageToggle } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { profileFormSchema, type ProfileForm } from '../schemas';
import { useCreateProfile } from '../hooks';

export function OnboardingPage() {
  const t = useT();
  const navigate = useNavigate();
  const create = useCreateProfile();
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileFormSchema) });

  return (
    <div className="flex flex-1 flex-col px-6 pt-[calc(2rem+var(--safe-top))] pb-8">
      <div className="mb-6 flex justify-end">
        <LanguageToggle />
      </div>
      <h1 className="text-2xl font-bold">{t('onboarding.title')}</h1>
      <p className="mt-2 mb-8 text-sm text-mist">{t('onboarding.lead')}</p>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((v) =>
          create.mutate(v, { onSuccess: () => navigate('/', { replace: true }) }),
        )}
      >
        <Input
          label={t('onboarding.handle')}
          prefix={<AtSign className="h-4 w-4" />}
          placeholder={t('onboarding.handlePlaceholder')}
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          error={t(form.formState.errors.handle?.message)}
          {...form.register('handle')}
        />
        <Input
          label={t('onboarding.displayName')}
          placeholder={t('onboarding.displayNamePlaceholder')}
          error={t(form.formState.errors.display_name?.message)}
          {...form.register('display_name')}
        />
        <ErrorMessage error={create.error} />
        <Button type="submit" size="lg" full loading={create.isPending}>
          {t('onboarding.start')}
        </Button>
      </form>
    </div>
  );
}
