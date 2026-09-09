import { useState } from 'react';
import { Ticket, Store, Globe, Check } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageHeader,
  PageLoading,
  Segmented,
  toast,
} from '@/shared/ui';
import { formatDate } from '@/shared/lib/date';
import { toUserMessage } from '@/shared/lib/errors';
import { describeDiscount } from '../discount';
import { useAvailableCoupons, useClaimCoupon, useMyCoupons } from '../hooks';

type Tab = 'available' | 'mine';

export function CouponsPage() {
  const [tab, setTab] = useState<Tab>('mine');
  const available = useAvailableCoupons();
  const mine = useMyCoupons();
  const claim = useClaimCoupon();
  const claimedIds = new Set((mine.data ?? []).map((uc) => uc.coupon_id));

  return (
    <>
      <PageHeader title="クーポン" back="/more" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mine', label: '保有中' },
            { value: 'available', label: '獲得する' },
          ]}
        />
        <ErrorMessage error={claim.error} />
        {tab === 'mine' ? (
          mine.isPending ? (
            <PageLoading />
          ) : !mine.data || mine.data.length === 0 ? (
            <EmptyState
              icon={<Ticket className="h-10 w-10" />}
              title="保有しているクーポンはありません"
              action={
                <Button variant="secondary" onClick={() => setTab('available')}>
                  クーポンを探す
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {mine.data
                .slice()
                .sort((a, b) => Number(!!a.used_at) - Number(!!b.used_at))
                .map((uc) => (
                  <CouponCard key={uc.id} coupon={uc.coupon} used={!!uc.used_at} />
                ))}
            </div>
          )
        ) : available.isPending ? (
          <PageLoading />
        ) : !available.data || available.data.length === 0 ? (
          <EmptyState
            icon={<Ticket className="h-10 w-10" />}
            title="配布中のクーポンはありません"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {available.data.map((c) => (
              <CouponCard
                key={c.id}
                coupon={c}
                action={
                  claimedIds.has(c.id) ? (
                    <Badge tone="success">
                      <Check className="mr-0.5 h-3 w-3" /> 獲得済み
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      loading={claim.isPending && claim.variables === c.id}
                      onClick={() =>
                        claim.mutate(c.id, {
                          onSuccess: () => toast.success('クーポンを獲得しました'),
                          onError: (e) => toast.error(toUserMessage(e)),
                        })
                      }
                    >
                      獲得する
                    </Button>
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function CouponCard({
  coupon,
  used,
  action,
  selected,
  onClick,
}: {
  coupon: {
    title: string;
    discount_type: string;
    value: number;
    min_amount: number;
    valid_until: string;
    merchant_id: string | null;
    merchant?: { name: string } | null;
  };
  used?: boolean;
  action?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <Card
      className={`flex items-center gap-3 border ${selected ? 'border-lime' : 'border-transparent'} ${used ? 'opacity-50' : ''}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-900 text-lime">
        {coupon.merchant_id ? <Store className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{coupon.title}</p>
        <p className="text-sm text-lime">{describeDiscount(coupon)}</p>
        <p className="text-xs text-mist">
          {coupon.merchant_id ? (coupon.merchant?.name ?? '店舗限定') : '全店共通'} ·{' '}
          {formatDate(coupon.valid_until)} まで
          {used && ' · 使用済み'}
        </p>
      </div>
      {action}
      {selected && <Check className="h-5 w-5 text-lime" />}
    </Card>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {body}
      </button>
    );
  }
  return body;
}
