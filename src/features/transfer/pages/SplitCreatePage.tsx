import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Scale } from 'lucide-react';
import {
  AmountInput,
  Avatar,
  Button,
  Card,
  ErrorMessage,
  Input,
  PageHeader,
  Sheet,
} from '@/shared/ui';
import { formatYen, parseYen } from '@/shared/lib/money';
import { useT } from '@/shared/i18n';
import type { PublicProfile } from '../api';
import { useCreateSplit } from '../hooks';
import { ProfilePicker } from '../components/ProfilePicker';
import { splitEvenly, sumAmounts } from '../split';

interface Member extends PublicProfile {
  amount: number | null;
}

export function SplitCreatePage() {
  const t = useT();
  const navigate = useNavigate();
  const create = useCreateSplit();
  const [total, setTotal] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [picking, setPicking] = useState(false);

  const memberSum = sumAmounts(members.map((m) => m.amount));
  const mismatch = total !== null && members.length > 0 && memberSum !== total;

  const applyEven = () => {
    if (total === null || members.length === 0) return;
    const amounts = splitEvenly(total, members.length);
    setMembers((ms) => ms.map((m, i) => ({ ...m, amount: amounts[i] ?? 0 })));
  };

  const submit = () => {
    if (total === null || members.length === 0 || mismatch) return;
    create.mutate(
      {
        total,
        members: members.map((m) => ({ handle: m.handle, amount: m.amount ?? 0 })),
        memo: memo || undefined,
      },
      { onSuccess: (r) => navigate(`/split/${r.id}`, { replace: true }) },
    );
  };

  return (
    <>
      <PageHeader title={t('split.createTitle')} back="/split" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <AmountInput value={total} onChange={setTotal} label={t('split.total')} autoFocus />
        <Input
          label={t('split.memo')}
          placeholder={t('split.memoPlaceholder')}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={40}
        />

        <div>
          <div className="mb-2 flex items-center">
            <p className="text-sm text-mist">{t('split.members')}</p>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              icon={<Scale className="h-4 w-4" />}
              onClick={applyEven}
              disabled={total === null || members.length === 0}
            >
              {t('split.even')}
            </Button>
          </div>
          <Card className="flex flex-col gap-2 p-3">
            {members.length === 0 && (
              <p className="py-2 text-center text-sm text-mist">{t('split.addMembers')}</p>
            )}
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar name={m.display_name} url={m.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.display_name}</p>
                  <p className="text-xs text-mist">@{m.handle}</p>
                </div>
                <span className="flex h-10 w-32 items-center gap-1 rounded-lg border border-ink-600 bg-ink-900 px-2 focus-within:border-lime">
                  <span className="text-sm text-mist">¥</span>
                  <input
                    inputMode="numeric"
                    aria-label={t('split.amountOf', { name: m.display_name })}
                    value={m.amount === null ? '' : m.amount.toLocaleString('ja-JP')}
                    onChange={(e) => {
                      const v = parseYen(e.target.value);
                      setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, amount: v } : x)));
                    }}
                    className="w-full bg-transparent text-right text-sm outline-none"
                  />
                </span>
                <button
                  type="button"
                  aria-label={t('split.remove')}
                  onClick={() => setMembers((ms) => ms.filter((x) => x.id !== m.id))}
                  className="rounded-full p-1.5 text-mist hover:bg-ink-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPicking(true)}
              disabled={members.length >= 20}
            >
              {t('split.addMember')}
            </Button>
          </Card>
          {members.length > 0 && (
            <p className={`mt-2 text-xs ${mismatch ? 'text-danger' : 'text-mist'}`}>
              {t('split.memberSum', { sum: formatYen(memberSum) })}{' '}
              {total !== null && t('split.totalOf', { total: formatYen(total) })}
              {mismatch && t('split.mismatch')}
            </p>
          )}
        </div>

        <ErrorMessage error={create.error} />
        <Button
          size="lg"
          full
          loading={create.isPending}
          disabled={
            total === null || members.length === 0 || mismatch || members.some((m) => !m.amount)
          }
          onClick={submit}
        >
          {t('split.submit')}
        </Button>
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title={t('split.addMemberTitle')}>
        <ProfilePicker
          autoFocus
          exclude={members.map((m) => m.id)}
          onSelect={(p) => {
            setMembers((ms) => [...ms, { ...p, amount: null }]);
            setPicking(false);
          }}
        />
      </Sheet>
    </>
  );
}
