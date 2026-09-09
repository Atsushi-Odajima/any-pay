import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Check, Clock, ExternalLink, X } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  PageLoading,
} from '@/shared/ui';
import { formatYen } from '@/shared/lib/money';
import { formatDateTime } from '@/shared/lib/date';
import { navigateExternal } from '@/shared/platform/print';
import { cn } from '@/shared/lib/cn';
import { useT } from '@/shared/i18n';
import { chargeStep } from '../chargeMethods';
import { useCancelChargeRequest, useChargeRequest, useInvalidateMoney } from '../hooks';

/** プロバイダから戻る着地点 兼 入金リクエストの処理状況。完了したら完了画面へ */
export function ChargePendingPage() {
  const t = useT();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const req = useChargeRequest(id);
  const cancel = useCancelChargeRequest();
  const invalidate = useInvalidateMoney();
  const result = params.get('result');

  useEffect(() => {
    if (req.data?.status === 'completed' && req.data.transaction_id) {
      invalidate();
      navigate(`/complete/${req.data.transaction_id}`, { replace: true });
    }
  }, [req.data, navigate, invalidate]);

  if (req.isPending) return <PageLoading />;
  const r = req.data;
  if (!r) {
    return (
      <>
        <PageHeader title={t('charge.pending.title')} back="/" />
        <EmptyState title={t('errors.CHARGE_NOT_FOUND')} />
      </>
    );
  }

  const step = chargeStep(r.status);
  const open = r.status === 'pending' || r.status === 'processing';
  const instructions =
    r.instructions && typeof r.instructions === 'object' && !Array.isArray(r.instructions)
      ? (r.instructions as Record<string, unknown>)
      : null;
  const steps = [
    t('charge.pending.stepReceived'),
    t('charge.pending.stepProcessing'),
    t('charge.pending.stepCompleted'),
  ];

  return (
    <>
      <PageHeader title={t('charge.pending.title')} back="/" />
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6">
        <Card className="text-center">
          <p className="text-xs text-mist">{t(`charge.methods.${r.method}`)}</p>
          <p className="mt-1 text-3xl font-bold">{formatYen(r.amount)}</p>
          <p className="mt-1 text-xs text-mist">{t(`charge.providers.${r.provider}`)}</p>
          <div className="mt-3">
            <Badge tone={step.failed ? 'danger' : r.status === 'completed' ? 'success' : 'warn'}>
              {t(`charge.pending.status.${r.status}`)}
            </Badge>
          </div>
        </Card>

        <Card>
          <ol className="flex flex-col gap-3">
            {steps.map((label, i) => {
              const done = i < step.index || (i === step.index && !step.failed && !open);
              const active = i === step.index && open;
              const failed = i === step.index && step.failed;
              return (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      done && 'bg-success/20 text-success',
                      active && 'bg-warn/20 text-warn',
                      failed && 'bg-danger/20 text-danger',
                      !done && !active && !failed && 'bg-ink-700 text-ink-400',
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : failed ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </span>
                  <span className={cn(!done && !active && !failed && 'text-mist')}>{label}</span>
                </li>
              );
            })}
          </ol>
          {open && <p className="mt-3 text-xs text-mist">{t('charge.pending.waiting')}</p>}
          {result === 'declined' && open && (
            <p className="mt-2 text-xs text-warn">{t('charge.pending.resultDeclined')}</p>
          )}
          {step.failed && r.failure_code && (
            <p className="mt-3 text-sm text-danger">{t(`errors.${r.failure_code}`)}</p>
          )}
        </Card>

        {instructions && (
          <Card>
            <p className="mb-2 text-xs font-semibold text-mist">
              {t('charge.pending.instructions')}
            </p>
            <dl className="divide-y divide-ink-700 text-sm">
              {Object.entries(instructions).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2">
                  <dt className="text-mist">{t(`charge.instructions.${k}`)}</dt>
                  <dd className="text-right font-medium break-all">
                    {k === 'expires_at' && typeof v === 'string' ? formatDateTime(v) : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        <ErrorMessage error={cancel.error} />
        <div className="mt-auto flex flex-col gap-2">
          {open && r.redirect_url && (
            <Button
              size="lg"
              full
              icon={<ExternalLink className="h-5 w-5" />}
              onClick={() => navigateExternal(r.redirect_url as string)}
            >
              {t('charge.pending.openProvider')}
            </Button>
          )}
          {r.status === 'pending' && (
            <Button
              variant="outline"
              full
              loading={cancel.isPending}
              onClick={() => cancel.mutate(r.id)}
            >
              {t('charge.pending.cancel')}
            </Button>
          )}
          {step.failed && (
            <Link to="/charge" replace>
              <Button full>{t('charge.pending.retry')}</Button>
            </Link>
          )}
          <Link to="/">
            <Button variant="ghost" full>
              {t('common.home')}
            </Button>
          </Link>
          <p className="text-center text-[11px] text-ink-400">
            {t('charge.pending.requestId')}: {r.id}
          </p>
        </div>
      </div>
    </>
  );
}
