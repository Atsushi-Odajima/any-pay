-- Phase 10: 通知 data の補完（多言語表示用）
begin;

select tests.create_user('alice', 'Alice');
select tests.create_user('bob', 'Bob');
select tests.create_user('carol', 'Carol');

select tests.login(tests.uid('alice'));
select public.charge_wallet(20000, 'bank', 'p10-charge-alice');
select tests.login(tests.uid('bob'));
select public.register_merchant('Bob Cafe', 'cafe');
select tests.login(tests.uid('carol'));
select public.charge_wallet(5000, 'bank', 'p10-charge-carol');

-- ===== 決済：payment_sent / payment_received =====
select tests.login(tests.uid('alice'));
select (public.pay_static((select id from public.merchants where name = 'Bob Cafe'), 2000, 'p10-pay-alice', null)).id as pay_tx \gset
do $$
declare d jsonb;
begin
  select data into d from public.notifications where type = 'payment_sent' and user_id = tests.uid('alice');
  assert d ->> 'merchant_name' = 'Bob Cafe', 'payment_sent.merchant_name';
  assert (d ->> 'amount')::bigint = 2000, 'payment_sent.amount';
  assert (d ->> 'points')::int = 10, 'payment_sent.points（0.5%）';
  assert (d ->> 'transaction_id')::uuid = (select id from public.transactions where idempotency_key = 'p10-pay-alice'), 'transaction_id は呼び出し元の値を保持';
  assert not (d ? 'from_name'), 'null の項目は保存しない';
end $$;
select tests.login(tests.uid('bob'));
do $$
declare d jsonb;
begin
  select data into d from public.notifications where type = 'payment_received' and user_id = tests.uid('bob');
  assert d ->> 'payer_name' = 'Alice' and d ->> 'payer_handle' = 'alice', 'payment_received.payer';
  assert d ->> 'merchant_name' = 'Bob Cafe', 'payment_received.merchant_name';
end $$;
select tests.ok('決済通知に店名・支払者・ポイントが入る');

-- ===== 送金：transfer_received（メモあり / なし） =====
select tests.login(tests.uid('alice'));
select public.transfer('carol', 1000, '  ランチ代  ', 'p10-transfer-1');
select public.transfer('carol', 500, '', 'p10-transfer-2');
select tests.login(tests.uid('carol'));
do $$
declare d1 jsonb; d2 jsonb;
begin
  select data into d1 from public.notifications where type = 'transfer_received' and (data ->> 'amount')::bigint = 1000;
  select data into d2 from public.notifications where type = 'transfer_received' and (data ->> 'amount')::bigint = 500;
  assert d1 ->> 'from_name' = 'Alice' and d1 ->> 'from_handle' = 'alice', 'transfer_received.from';
  assert d1 ->> 'memo' = 'ランチ代', 'memo は trim される';
  assert not (d2 ? 'memo'), '空メモは保存しない';
end $$;
select tests.ok('送金通知に送金者・メモが入る');

-- ===== 割り勘：split_requested / split_paid（残人数） =====
select tests.login(tests.uid('alice'));
select (public.create_split_request(3000, '[{"handle":"bob","amount":1500},{"handle":"carol","amount":1500}]', '飲み会')).id as split_id \gset
select tests.login(tests.uid('bob'));
do $$
declare d jsonb;
begin
  select data into d from public.notifications where type = 'split_requested' and user_id = tests.uid('bob');
  assert d ->> 'creator_name' = 'Alice' and d ->> 'creator_handle' = 'alice', 'split_requested.creator';
  assert d ->> 'memo' = '飲み会', 'split_requested.memo';
  assert (d ->> 'amount')::bigint = 1500, 'split_requested.amount';
end $$;
select public.charge_wallet(5000, 'bank', 'p10-charge-bob');
select public.pay_split((select id from public.split_members where user_id = tests.uid('bob') and split_request_id = :'split_id'), 'p10-split-bob');
select tests.login(tests.uid('carol'));
select public.pay_split((select id from public.split_members where user_id = tests.uid('carol') and split_request_id = :'split_id'), 'p10-split-carol');
select tests.login(tests.uid('alice'));
do $$
declare d_bob jsonb; d_carol jsonb;
begin
  select data into d_bob from public.notifications where type = 'split_paid' and data ->> 'payer_name' = 'Bob';
  select data into d_carol from public.notifications where type = 'split_paid' and data ->> 'payer_name' = 'Carol';
  assert d_bob ->> 'payer_handle' = 'bob' and (d_bob ->> 'remaining')::int = 1, 'split_paid(bob).remaining = 1';
  assert d_carol ->> 'payer_handle' = 'carol' and (d_carol ->> 'remaining')::int = 0, 'split_paid(carol).remaining = 0';
  assert d_bob ->> 'memo' = '飲み会', 'split_paid.memo';
end $$;
select tests.ok('割り勘通知に作成者・支払者・残人数が入る');

-- ===== 返金：refund_received（ポイント取消） =====
select tests.login(tests.uid('bob'));
select public.refund_transaction(:'pay_tx');
select tests.login(tests.uid('alice'));
do $$
declare d jsonb;
begin
  select data into d from public.notifications where type = 'refund_received' and user_id = tests.uid('alice');
  assert d ->> 'merchant_name' = 'Bob Cafe', 'refund_received.merchant_name';
  assert (d ->> 'points')::int = 10, 'refund_received.points は正の値';
  assert (d ->> 'amount')::bigint = 2000, 'refund_received.amount';
end $$;
select tests.ok('返金通知に店名・取消ポイントが入る');

-- ===== 互換：title / body（日本語）は従来どおり保存される =====
do $$
begin
  assert exists (select 1 from public.notifications where type = 'payment_sent' and title like 'Bob Cafe に ¥2,000%'), 'title 互換';
end $$;
select tests.ok('title / body は従来どおり保存（古いクライアントのフォールバック）');

rollback;
