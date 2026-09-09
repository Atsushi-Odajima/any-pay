-- Phase 8: Stripe webhook 用の charge_wallet_for
begin;

select tests.create_user('alice', 'Alice');

-- ユーザー自身は呼べない（権限）
select tests.login(tests.uid('alice'));
select tests.expect_error(
  format('select public.charge_wallet_for(%L, 1000, ''stripe'', ''cs_test_001'')', tests.uid('alice')),
  'permission denied');
-- ユーザーは charge_wallet で method=stripe を名乗れない
select tests.expect_error('select public.charge_wallet(1000, ''stripe'', ''fake-stripe-key-1'')', '^INVALID_METHOD$');
select tests.ok('ユーザーは charge_wallet_for を呼べない / stripe を名乗れない');

-- service_role（Edge Function）として呼ぶ
select tests.logout();
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
do $$
declare t1 public.transactions; t2 public.transactions;
begin
  t1 := public.charge_wallet_for(tests.uid('alice'), 3000, 'stripe', 'cs_test_001', '{"stripe_session_id":"cs_test_001"}');
  assert t1.type = 'charge' and t1.amount = 3000 and (t1.metadata ->> 'method') = 'stripe', 'stripe charge';
  -- webhook 再送（同じ session id）は二重計上されない
  t2 := public.charge_wallet_for(tests.uid('alice'), 3000, 'stripe', 'cs_test_001');
  assert t1.id = t2.id, '再送は同じ取引';
end $$;
select tests.expect_error(format('select public.charge_wallet_for(%L, 100001, ''stripe'', ''cs_test_002'')', tests.uid('alice')), '^LIMIT_EXCEEDED$');
select tests.expect_error(format('select public.charge_wallet_for(%L, 100, ''card'', ''cs_test_003'')', tests.uid('alice')), '^INVALID_METHOD$');
reset role;
select set_config('request.jwt.claim.role', '', true);

select tests.login(tests.uid('alice'));
do $$ begin
  assert (select balance_cache from public.wallets where kind = 'user') = 3000, 'alice 残高 3000（1回分）';
  assert (select count(*) from public.transactions where idempotency_key = 'cs_test_001') = 1, '取引1件';
end $$;
select tests.ok('service_role からの charge_wallet_for は冪等（webhook 再送で二重計上なし）');

-- authenticated が role claim を偽装しても DB ロールの権限で拒否される
select set_config('request.jwt.claim.role', 'service_role', true);
select tests.expect_error(
  format('select public.charge_wallet_for(%L, 1000, ''stripe'', ''cs_test_004'')', tests.uid('alice')),
  'permission denied');
select tests.ok('authenticated ロールは claim を偽装しても呼べない');

rollback;
