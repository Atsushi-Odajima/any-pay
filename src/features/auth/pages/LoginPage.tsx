import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate } from 'react-router';
import { Smartphone, KeyRound } from 'lucide-react';
import { Button, ErrorMessage, Input, LanguageToggle, Segmented } from '@/shared/ui';
import { useT } from '@/shared/i18n';
import { normalizePhone, formatPhoneForDisplay } from '../phone';
import { useSendOtp, useSession, useSignInWithPassword, useVerifyOtp } from '../hooks';

const phoneSchema = z.object({
  phone: z.string().refine((v) => normalizePhone(v) !== null, 'validation.phone'),
});
const otpSchema = z.object({ token: z.string().regex(/^\d{6}$/, 'validation.otp') });
const passwordSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9_.-]{2,32}$/i, 'validation.idFormat'),
  password: z.string().min(1, 'validation.passwordRequired'),
});

type Mode = 'phone' | 'password';

export function LoginPage() {
  const t = useT();
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>('phone');
  const [phone, setPhone] = useState<string | null>(null);
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const signIn = useSignInWithPassword();

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema) });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  if (status === 'signed_in') return <Navigate to="/" replace />;

  return (
    <div className="flex flex-1 flex-col px-6 pt-[calc(2rem+var(--safe-top))] pb-8">
      <div className="mb-6 flex justify-end">
        <LanguageToggle />
      </div>
      <div className="mb-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime text-ink">
          {mode === 'phone' ? <Smartphone className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
        </div>
        <h1 className="text-2xl font-bold">{t('login.title')}</h1>
        <p className="mt-2 text-sm text-mist">
          {mode === 'phone' ? t('login.phoneLead') : t('login.passwordLead')}
        </p>
      </div>

      <Segmented
        className="mb-5"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setPhone(null);
          sendOtp.reset();
          verifyOtp.reset();
          signIn.reset();
        }}
        options={[
          { value: 'phone', label: t('login.tabPhone') },
          { value: 'password', label: t('login.tabPassword') },
        ]}
      />

      {mode === 'password' ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={passwordForm.handleSubmit((v) =>
            signIn.mutate({ id: v.id, password: v.password }),
          )}
        >
          <Input
            label={t('login.id')}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            placeholder="kuro"
            autoFocus
            error={t(passwordForm.formState.errors.id?.message)}
            {...passwordForm.register('id')}
          />
          <Input
            label={t('login.password')}
            type="password"
            autoComplete="current-password"
            error={t(passwordForm.formState.errors.password?.message)}
            {...passwordForm.register('password')}
          />
          <ErrorMessage error={signIn.error} />
          <Button type="submit" size="lg" full loading={signIn.isPending}>
            {t('login.login')}
          </Button>
        </form>
      ) : phone === null ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={phoneForm.handleSubmit((v) => {
            const e164 = normalizePhone(v.phone);
            if (!e164) return;
            sendOtp.mutate(e164, { onSuccess: () => setPhone(e164) });
          })}
        >
          <Input
            label={t('login.phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('login.phonePlaceholder')}
            autoFocus
            error={t(phoneForm.formState.errors.phone?.message)}
            {...phoneForm.register('phone')}
          />
          <ErrorMessage error={sendOtp.error} />
          <Button type="submit" size="lg" full loading={sendOtp.isPending}>
            {t('login.sendCode')}
          </Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={otpForm.handleSubmit((v) => verifyOtp.mutate({ phone, token: v.token }))}
        >
          <p className="text-sm text-mist">
            {t('login.codeSentTo')}{' '}
            <span className="font-mono text-white">{formatPhoneForDisplay(phone)}</span>
          </p>
          <Input
            label={t('login.code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            autoFocus
            className="font-mono text-2xl tracking-[0.4em]"
            error={t(otpForm.formState.errors.token?.message)}
            {...otpForm.register('token')}
          />
          <ErrorMessage error={verifyOtp.error} />
          <Button type="submit" size="lg" full loading={verifyOtp.isPending}>
            {t('login.login')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPhone(null);
              verifyOtp.reset();
            }}
          >
            {t('login.changePhone')}
          </Button>
        </form>
      )}

      <p className="mt-auto pt-10 text-center text-xs text-ink-400">{t('common.demoNote')}</p>
    </div>
  );
}
