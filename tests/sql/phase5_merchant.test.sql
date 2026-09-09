-- Phase 5: 返金・本日売上
begin;

select tests.create_user('alice', 'Alice');
select tests.create_user('bob', 'Bob');
select tests.create_user('carol', 'Carol');

select tests.login(tests.uid('alice'));
select public.charge_wallet(10000, 'bank', 'p5-charge-alice');
select tests.login(tests.uid('bob'));
select public.register_merchant('Bob Cafe', 'cafe');
select tests.login(tests.uid('carol'));
select public.register_merchant('Carol Books', 'books');

-- alice が Bob Cafe に 2000 円支払う（10pt）
select tests.login(tests.uid('alice'));
select (public.pay_static((select id from public.merchants where name = 'Bob Cafe'), 2000, 'p5-pay-1')).id as pay1 \gset
select (public.pay_static((select id from public.merchants where name = 'Bob Cafe'), 500, 'p5-pay-2')).id as pay2 \gset
do $$ begin
  assert (select balance from public.point_balances) = 12, '10pt + 2pt';
  assert (select balance_cache from public.wallets where kind = 'user') = 7500, 'alice 7500';
end $$;

-- 他店のオーナー（carol）は返金できない
select tests.login(tests.uid('carol'));
select tests.expect_error(format('select public.refund_transaction(%L)', :'pay1'), '^NOT_MERCHANT_OWNER$');
-- 支払者本人も返金できない
select tests.login(tests.uid('alice'));
select tests.expect_error(format('select public.refund_transaction(%L)', :'pay1'), '^NOT_MERCHANT_OWNER$');
select tests.ok('返金は加盟店オーナーのみ');

-- 本日売上（返金前）
select tests.login(tests.uid('bob'));
do $$
declare j jsonb := public.merchant_today_summary((select id from public.merchants where owner_id = tests.uid('bob')));
begin
  assert (j ->> 'sales')::bigint = 2500 and (j ->> 'count')::int = 2, '売上 2500 / 2件';
  assert (j ->> 'refunds')::bigint = 0, '返金 0';
end $$;
select tests.ok('merchant_today_summary（返金前）');

-- 返金
do $$
declare r public.transactions; pay1 uuid := (select id from public.transactions where idempotency_key = 'p5-pay-1');
begin
  r := public.refund_transaction(pay1);
  assert r.type = 'refund' and r.amount = 2000 and r.status = 'completed', 'refund 2000';
  assert (r.metadata ->> 'refund_of') = pay1::text, 'metadata.refund_of';
  assert (r.metadata ->> 'points')::int = -10, 'metadata.points = -10';
  assert (select status from public.transactions where id = pay1) = 'refunded', '元取引が refunded';
  assert (select metadata ->> 'refund_transaction_id' from public.transactions where id = pay1) = r.id::text, '元取引に返金IDが記録される';
  assert (select balance_cache from public.wallets where owner_id = tests.uid('bob') and kind = 'merchant') = 500, '店舗残高 500';
end $$;
select tests.expect_error(format('select public.refund_transaction(%L)', :'pay1'), '^ALREADY_REFUNDED$');
select tests.ok('refund_transaction 成功 / 二重返金拒否');

-- 支払者側：残高・ポイント・通知
select tests.login(tests.uid('alice'));
do $$ begin
  assert (select balance_cache from public.wallets where kind = 'user') = 9500, 'alice 9500';
  assert (select balance from public.point_balances) = 2, 'ポイント取消 → 2pt';
  assert (select count(*) from public.point_entries where reason = 'refund' and delta = -10) = 1, '取消エントリ';
  assert (select count(*) from public.notifications where type = 'refund_received') = 1, '返金通知';
  -- 履歴：refund の ledger 行が +2000
  assert (select amount from public.ledger_entries where transaction_id = (select id from public.transactions where type = 'refund')) = 2000, 'ledger +2000';
end $$;
select tests.ok('返金後にユーザー残高・ポイントが戻る');

-- 決済以外は返金不可
select tests.login(tests.uid('bob'));
select tests.expect_error(
  format('select public.refund_transaction(%L)', (select id from public.transactions where type = 'refund')),
  '^NOT_REFUNDABLE$');
select tests.expect_error(format('select public.refund_transaction(%L)', gen_random_uuid()), '^TRANSACTION_NOT_FOUND$');
select tests.ok('決済以外 / 存在しない取引は返金不可');

-- 店舗残高不足（出金後）の返金は拒否
select public.withdraw(500, 'p5-withdraw-bob', (select id from public.wallets where owner_id = tests.uid('bob') and kind = 'merchant'));
select tests.expect_error(format('select public.refund_transaction(%L)', :'pay2'), '^INSUFFICIENT_FUNDS$');
do $$ begin
  assert (select status from public.transactions where idempotency_key = 'p5-pay-2') = 'completed', '失敗時は元取引が変わらない';
end $$;
select tests.ok('店舗残高不足の返金は INSUFFICIENT_FUNDS');

-- 本日売上（返金後）
do $$
declare j jsonb := public.merchant_today_summary((select id from public.merchants where owner_id = tests.uid('bob')));
begin
  assert (j ->> 'sales')::bigint = 2500 and (j ->> 'count')::int = 2, '売上は総額のまま';
  assert (j ->> 'refunds')::bigint = 2000 and (j ->> 'refund_count')::int = 1, '返金 2000 / 1件';
  assert (j ->> 'net')::bigint = 500, '純売上 500';
end $$;
select tests.ok('merchant_today_summary（返金後）');

-- 台帳整合
select tests.logout();
do $$ begin
  assert (select sum(amount) from public.ledger_entries) = 0, 'ledger 合計 0';
  assert not exists (
    select 1 from public.wallets w
    left join (select wallet_id, sum(amount) s from public.ledger_entries group by wallet_id) l on l.wallet_id = w.id
    where w.balance_cache <> coalesce(l.s, 0)
  ), 'balance_cache = sum(ledger)';
end $$;
select tests.ok('台帳整合');

rollback;
