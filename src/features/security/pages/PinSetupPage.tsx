import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, ErrorMessage, PageHeader, toast } from '@/shared/ui';
import { vibrate } from '@/shared/platform/haptics';
import { useT } from '@/shared/i18n';
import { usePinStatus, useSetPin } from '../hooks';
import { PinDots, PinPad } from '../components/PinPad';

type Step = 'current' | 'new' | 'confirm';

export function PinSetupPage() {
  const t = useT();
  const navigate = useNavigate();
  const status = usePinStatus();
  const setPin = useSetPin();
  const hasPin = status.data?.has_pin ?? false;
  const [step, setStep] = useState<Step>(hasPin ? 'current' : 'new');
  const [current, setCurrent] = useState('');
  const [first, setFirst] = useState('');
  const [value, setValue] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const effectiveStep: Step = status.isPending
    ? 'new'
    : step === 'current' && !hasPin
      ? 'new'
      : hasPin && step === 'new' && !current
        ? 'current'
        : step;

  const title =
    effectiveStep === 'current'
      ? t('security.setup.current')
      : effectiveStep === 'new'
        ? t('security.setup.new')
        : t('security.setup.confirm');

  const next = (v: string) => {
    if (effectiveStep === 'current') {
      setCurrent(v);
      setValue('');
      setStep('new');
      return;
    }
    if (effectiveStep === 'new') {
      setFirst(v);
      setValue('');
      setStep('confirm');
      return;
    }
    if (v !== first) {
      setMismatch(true);
      vibrate('error');
      setValue('');
      setStep('new');
      setFirst('');
      return;
    }
    setPin.mutate(
      { pin: v, currentPin: hasPin ? current : undefined },
      {
        onSuccess: () => {
          toast.success(hasPin ? t('security.setup.changed') : t('security.setup.setDone'));
          navigate('/settings/security', { replace: true });
        },
        onError: () => {
          vibrate('error');
          setValue('');
          setFirst('');
          setCurrent('');
          setStep(hasPin ? 'current' : 'new');
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title={hasPin ? t('security.setup.change') : t('security.setup.set')}
        back="/settings/security"
      />
      <div className="flex flex-col gap-6 px-4 pb-6 pt-4">
        <p className="text-center text-sm text-mist">{title}</p>
        <PinDots length={value.length} />
        {mismatch && (
          <p className="text-center text-sm text-danger">{t('security.setup.mismatch')}</p>
        )}
        <ErrorMessage error={setPin.error} />
        <PinPad
          value={value}
          onChange={(v) => {
            setMismatch(false);
            setValue(v);
          }}
          disabled={setPin.isPending}
          onComplete={(v) => next(v)}
        />
        <Button
          full
          disabled={value.length < 4}
          loading={setPin.isPending}
          onClick={() => next(value)}
        >
          {effectiveStep === 'confirm' ? t('security.setup.submit') : t('security.setup.next')}
        </Button>
        <p className="text-xs text-ink-400">{t('security.setup.note')}</p>
      </div>
    </>
  );
}
