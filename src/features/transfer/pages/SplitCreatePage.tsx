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
import type { PublicProfile } from '../api';
import { useCreateSplit } from '../hooks';
import { ProfilePicker } from '../components/ProfilePicker';
import { splitEvenly, sumAmounts } from '../split';

interface Member extends PublicProfile {
  amount: number | null;
}

export function SplitCreatePage() {
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
      <PageHeader title="割り勘を作成" back="/split" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <AmountInput
          value={total}
          onChange={setTotal}
          label="合計金額（あなたが立て替えた額）"
          autoFocus
        />
        <Input
          label="メモ（任意）"
          placeholder="例：9/9 飲み会"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={40}
        />

        <div>
          <div className="mb-2 flex items-center">
            <p className="text-sm text-mist">メンバー（あなた以外）</p>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              icon={<Scale className="h-4 w-4" />}
              onClick={applyEven}
              disabled={total === null || members.length === 0}
            >
              均等に按分
            </Button>
          </div>
          <Card className="flex flex-col gap-2 p-3">
            {members.length === 0 && (
              <p className="py-2 text-center text-sm text-mist">メンバーを追加してください</p>
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
                    aria-label={`${m.display_name} の金額`}
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
                  aria-label="削除"
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
              メンバーを追加
            </Button>
          </Card>
          {members.length > 0 && (
            <p className={`mt-2 text-xs ${mismatch ? 'text-danger' : 'text-mist'}`}>
              メンバー合計 {formatYen(memberSum)} {total !== null && `/ 合計 ${formatYen(total)}`}
              {mismatch && ' — 合計が一致していません'}
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
          作成してリクエストを送る
        </Button>
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title="メンバーを追加">
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
