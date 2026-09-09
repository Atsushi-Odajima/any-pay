import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { AtSign } from 'lucide-react';
import { Button, ErrorMessage, Input } from '@/shared/ui';
import { profileFormSchema, type ProfileForm } from '../schemas';
import { useCreateProfile } from '../hooks';

export function OnboardingPage() {
  const navigate = useNavigate();
  const create = useCreateProfile();
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileFormSchema) });

  return (
    <div className="flex flex-1 flex-col px-6 pt-[calc(3rem+var(--safe-top))] pb-8">
      <h1 className="text-2xl font-bold">プロフィールを設定</h1>
      <p className="mt-2 mb-8 text-sm text-mist">
        ID は送金の宛先や受取QRに使われます。あとから変更できます。
      </p>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((v) =>
          create.mutate(v, { onSuccess: () => navigate('/', { replace: true }) }),
        )}
      >
        <Input
          label="ID（英小文字・数字・_）"
          prefix={<AtSign className="h-4 w-4" />}
          placeholder="taro_yamada"
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          error={form.formState.errors.handle?.message}
          {...form.register('handle')}
        />
        <Input
          label="表示名"
          placeholder="山田 太郎"
          error={form.formState.errors.display_name?.message}
          {...form.register('display_name')}
        />
        <ErrorMessage error={create.error} />
        <Button type="submit" size="lg" full loading={create.isPending}>
          はじめる
        </Button>
      </form>
    </div>
  );
}
