import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AtSign } from 'lucide-react';
import { Button, ErrorMessage, Input, PageHeader, PageLoading, Avatar, toast } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { profileFormSchema, type ProfileForm } from '../schemas';
import { useMyProfile, useUpdateProfile } from '../hooks';

export function ProfilePage() {
  const t = useT();
  const profile = useMyProfile();
  const update = useUpdateProfile();
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    values: profile.data
      ? { handle: profile.data.handle, display_name: profile.data.display_name }
      : undefined,
  });

  if (profile.isPending) return <PageLoading />;
  if (!profile.data) return null;

  return (
    <>
      <PageHeader title={t('profile.title')} back="/more" />
      <div className="flex flex-col items-center gap-2 py-6">
        <Avatar name={profile.data.display_name} url={profile.data.avatar_url} size="lg" />
        <p className="text-sm text-mist">@{profile.data.handle}</p>
      </div>
      <form
        className="flex flex-col gap-4 px-4"
        onSubmit={form.handleSubmit((v) =>
          update.mutate(v, { onSuccess: () => toast.success(t('profile.updated')) }),
        )}
      >
        <Input
          label={t('profile.id')}
          prefix={<AtSign className="h-4 w-4" />}
          autoCapitalize="none"
          error={t(form.formState.errors.handle?.message)}
          {...form.register('handle')}
        />
        <Input
          label={t('profile.displayName')}
          error={t(form.formState.errors.display_name?.message)}
          {...form.register('display_name')}
        />
        <ErrorMessage error={update.error} />
        <Button type="submit" full loading={update.isPending} disabled={!form.formState.isDirty}>
          {t('common.save')}
        </Button>
      </form>
    </>
  );
}
