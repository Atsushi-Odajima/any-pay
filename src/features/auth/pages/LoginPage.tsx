import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate } from 'react-router';
import { Smartphone } from 'lucide-react';
import { Button, ErrorMessage, Input } from '@/shared/ui';
import { normalizePhone, formatPhoneForDisplay } from '../phone';
import { useSendOtp, useSession, useVerifyOtp } from '../hooks';

const phoneSchema = z.object({
  phone: z.string().refine((v) => normalizePhone(v) !== null, '電話番号の形式が正しくありません'),
});
const otpSchema = z.object({
  token: z.string().regex(/^\d{6}$/, '6桁の数字を入力してください'),
});

export function LoginPage() {
  const { status } = useSession();
  const [phone, setPhone] = useState<string | null>(null);
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema) });

  if (status === 'signed_in') return <Navigate to="/" replace />;

  return (
    <div className="flex flex-1 flex-col px-6 pt-[calc(3rem+var(--safe-top))] pb-8">
      <div className="mb-10">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime text-ink">
          <Smartphone className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Any Pay にログイン</h1>
        <p className="mt-2 text-sm text-mist">
          電話番号に届く6桁の認証コードでログインします。デモ環境ではテスト用番号と固定コードを使います。
        </p>
      </div>

      {phone === null ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={phoneForm.handleSubmit((v) => {
            const e164 = normalizePhone(v.phone);
            if (!e164) return;
            sendOtp.mutate(e164, { onSuccess: () => setPhone(e164) });
          })}
        >
          <Input
            label="電話番号"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="090-1234-5678"
            autoFocus
            error={phoneForm.formState.errors.phone?.message}
            {...phoneForm.register('phone')}
          />
          <ErrorMessage error={sendOtp.error} />
          <Button type="submit" size="lg" full loading={sendOtp.isPending}>
            認証コードを送る
          </Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={otpForm.handleSubmit((v) => verifyOtp.mutate({ phone, token: v.token }))}
        >
          <p className="text-sm text-mist">
            <span className="font-mono text-white">{formatPhoneForDisplay(phone)}</span>{' '}
            に送った認証コードを入力してください
          </p>
          <Input
            label="認証コード"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            autoFocus
            className="font-mono text-2xl tracking-[0.4em]"
            error={otpForm.formState.errors.token?.message}
            {...otpForm.register('token')}
          />
          <ErrorMessage error={verifyOtp.error} />
          <Button type="submit" size="lg" full loading={verifyOtp.isPending}>
            ログイン
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPhone(null);
              verifyOtp.reset();
            }}
          >
            電話番号を変更する
          </Button>
        </form>
      )}

      <p className="mt-auto pt-10 text-center text-xs text-ink-400">
        これはポートフォリオ用のデモです。実際のお金は動きません。
      </p>
    </div>
  );
}
