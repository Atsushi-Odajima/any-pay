-- Phase 6: クーポン / ポイント / PIN
begin;

select tests.create_user('alice', 'Alice');
select tests.create_user('bob', 'Bob');
select tests.create_user('carol', 'Carol');

select tests.login(tests.uid('alice'));
select public.charge_wallet(20000, 'bank', 'p6-charge-alice');
select tests.login(tests.uid('bob'));
select public.register_merchant('Bob Cafe', 'cafe');
select tests.login(tests.uid('carol'));
select public.register_merchant('Carol Books', 'books');

-- 店舗クーポン（bob が RLS 経由で直接 INSERT）と全店共通クーポン（管理者 = superuser が作成）
select tests.login(tests.uid('bob'));
insert into public.coupons (merchant_id, title, discount_type, value, min_amount, valid_until, max_uses)
values ((select id from public.merchants where owner_id = tests.uid('bob')), 'Bob Cafe 300円引き', 'fixed', 300, 1000, now() + interval '30 days', 1);
-- 他店のクーポンは作れない
select tests.expect_error(
  format('insert into public.coupons (merchant_id, title, discount_type, value, valid_until) values (%L, ''x'', ''fixed'', 1, now() + interval ''1 day'')',
    (select id from public.merchants where name = 'Carol Books')),
  'row-level security');
select tests.expect_error(
  'insert into public.coupons (merchant_id, title, discount_type, value, valid_until) values (null, ''x'', ''fixed'', 1, now() + interval ''1 day'')',
  'row-level security');
select tests.ok('クーポン作成は自店のみ（全店共通は管理者のみ）');

select tests.logout();
insert into public.coupons (merchant_id, title, discount_type, value, min_amount, valid_until)
values (null, '全店 10% OFF', 'percent', 10, 0, now() + interval '30 days');
insert into public.coupons (merchant_id, title, discount_type, value, min_amount, valid_until)
values (null, '期限切れ', 'fixed', 100, 0, now() - interval '1 day');

-- ===== 獲得 =====
select tests.login(tests.uid('alice'));
select (public.claim_coupon((select id from public.coupons where title = 'Bob Cafe 300円引き'))).id as uc_bob \gset
select (public.claim_coupon((select id from public.coupons where title = '全店 10% OFF'))).id as uc_all \gset
select tests.expect_error(format('select public.claim_coupon(%L)', (select id from public.coupons where title = 'Bob Cafe 300円引き')), '^COUPON_ALREADY_CLAIMED$');
select tests.expect_error(format('select public.claim_coupon(%L)', (select id from public.coupons where title = '期限切れ')), '^COUPON_INVALID$');
-- max_uses = 1 なので carol は獲得できない
select tests.login(tests.uid('carol'));
select tests.expect_error(format('select public.claim_coupon(%L)', (select id from public.coupons where title = 'Bob Cafe 300円引き')), '^COUPON_EXHAUSTED$');
select tests.ok('claim_coupon（重複 / 期限切れ / 上限）');

-- ===== 適用：店舗クーポン（加盟店負担・補填なし） =====
select tests.login(tests.uid('alice'));
select tests.expect_error(
  format('select public.pay_static(%L, 500, ''p6-pay-min'', %L)', (select id from public.merchants where name = 'Bob Cafe'), :'uc_bob'),
  '^COUPON_MIN_AMOUNT$');
select tests.expect_error(
  format('select public.pay_static(%L, 2000, ''p6-pay-wrong'', %L)', (select id from public.merchants where name = 'Carol Books'), :'uc_bob'),
  '^COUPON_NOT_FOR_MERCHANT$');
do $$
declare tx public.transactions; uc uuid := (select uc.id from public.user_coupons uc join public.coupons c on c.id = uc.coupon_id where c.title = 'Bob Cafe 300円引き');
begin
  tx := public.pay_static((select id from public.merchants where name = 'Bob Cafe'), 2000, 'p6-pay-bob', uc);
  assert tx.amount = 1700, '支払額 1700';
  assert (tx.metadata ->> 'original_amount')::bigint = 2000 and (tx.metadata ->> 'discount')::bigint = 300, 'metadata 割引';
  assert (tx.metadata ->> 'coupon_title') = 'Bob Cafe 300円引き', 'coupon_title';
  assert tx.metadata ? 'subsidy' = false, '店舗クーポンは補填なし';
  assert (tx.metadata ->> 'points')::int = 8, '1700 * 0.5% = 8pt';
  assert (select used_at from public.user_coupons where id = uc) is not null, 'used_at';
  assert (select transaction_id from public.user_coupons where id = uc) = tx.id, 'transaction_id';
  assert (select balance_cache from public.wallets where kind = 'user') = 18300, 'alice 18300';
  -- ledger：alice -1700 / merchant +1700（2行のみ）
  assert (select count(*) from public.ledger_entries where transaction_id = tx.id) = 1, 'alice から見える ledger は自分の1行';
end $$;
select tests.logout();
do $$
declare tx uuid := (select id from public.transactions where idempotency_key = 'p6-pay-bob');
begin
  assert (select count(*) from public.ledger_entries where transaction_id = tx) = 2, '2行の仕訳';
  assert (select amount from public.ledger_entries where transaction_id = tx and wallet_id = (select wallet_id from public.merchants where name = 'Bob Cafe')) = 1700, '店舗 +1700';
end $$;
select tests.ok('店舗クーポン適用：割引額が台帳と一致');

-- 使用済みクーポンは使えない
select tests.login(tests.uid('alice'));
select tests.expect_error(
  format('select public.pay_static(%L, 2000, ''p6-pay-used'', %L)', (select id from public.merchants where name = 'Bob Cafe'), :'uc_bob'),
  '^COUPON_USED$');
-- 他人のクーポンは使えない
select tests.login(tests.uid('carol'));
select public.charge_wallet(5000, 'bank', 'p6-charge-carol');
select tests.expect_error(
  format('select public.pay_static(%L, 2000, ''p6-pay-others'', %L)', (select id from public.merchants where name = 'Bob Cafe'), :'uc_all'),
  '^COUPON_INVALID$');
select tests.ok('使用済み / 他人のクーポンは拒否');

-- ===== 適用：全店共通クーポン（treasury が補填） =====
select tests.login(tests.uid('alice'));
do $$
declare tx public.transactions; uc uuid := (select uc.id from public.user_coupons uc join public.coupons c on c.id = uc.coupon_id where c.title = '全店 10% OFF');
begin
  tx := public.pay_static((select id from public.merchants where name = 'Carol Books'), 3000, 'p6-pay-carol', uc);
  assert tx.amount = 2700, '支払額 2700（10% OFF）';
  assert (tx.metadata ->> 'subsidy')::bigint = 300, '補填 300';
  assert (select balance_cache from public.wallets where kind = 'user') = 18300 - 2700, 'alice 15600';
end $$;
select tests.logout();
do $$
declare
  tx uuid := (select id from public.transactions where idempotency_key = 'p6-pay-carol');
  mw uuid := (select wallet_id from public.merchants where name = 'Carol Books');
begin
  assert (select count(*) from public.ledger_entries where transaction_id = tx) = 3, '3行の仕訳（payer / merchant / treasury）';
  assert (select amount from public.ledger_entries where transaction_id = tx and wallet_id = mw) = 3000, '店舗は満額 3000 を受け取る';
  assert (select amount from public.ledger_entries where transaction_id = tx and wallet_id = public._treasury_id()) = -300, 'treasury -300';
  assert (select sum(amount) from public.ledger_entries where transaction_id = tx) = 0, '合計 0';
  assert (select balance_cache from public.wallets where id = mw) = 3000, '店舗残高 3000';
end $$;
select tests.ok('全店共通クーポン：treasury 補填の3行仕訳が台帳と一致');

-- 返金で補填が戻り、クーポンが復活し、ポイントが取り消される
select tests.login(tests.uid('carol'));
do $$
declare r public.transactions; tx uuid := (select id from public.transactions where idempotency_key = 'p6-pay-carol');
begin
  r := public.refund_transaction(tx);
  assert r.amount = 2700 and (r.metadata ->> 'subsidy')::bigint = -300, '返金 2700 / 補填戻し 300';
end $$;
select tests.logout();
do $$
declare mw uuid := (select wallet_id from public.merchants where name = 'Carol Books');
begin
  assert (select balance_cache from public.wallets where id = mw) = 0, '店舗残高 0';
  assert (select balance_cache from public.wallets where id = public._treasury_id()) = -(20000 + 5000), 'treasury は補填分が戻って -25000';
  assert (select used_at from public.user_coupons uc join public.coupons c on c.id = uc.coupon_id where c.title = '全店 10% OFF') is null, 'クーポン復活';
end $$;
select tests.login(tests.uid('alice'));
do $$ begin
  assert (select balance from public.point_balances) = 8, '8pt（返金分の 13pt は取り消し）';
  assert (select balance_cache from public.wallets where kind = 'user') = 18300, 'alice 18300 に戻る';
end $$;
select tests.ok('返金で補填の戻し・クーポン復活・ポイント取消');

-- ===== PIN =====
select tests.expect_error('select public.verify_pin(''1234'')', '^PIN_NOT_SET$');
select tests.expect_error('select public.set_pin(''12'')', '^PIN_FORMAT$');
select tests.expect_error('select public.set_pin(''abcd'')', '^PIN_FORMAT$');
do $$ begin
  assert public.set_pin('1234'), 'set_pin';
  assert (public.pin_status() ->> 'has_pin')::boolean, 'has_pin';
  assert (public.pin_status() ->> 'verified')::boolean, '設定直後は verified';
  assert (public.verify_pin('1234') ->> 'ok')::boolean, 'verify ok';
end $$;
-- pin_hash は本人でも直接更新できない（Phase 1 で確認済み）。変更は現在の PIN が必要
select tests.expect_error('select public.set_pin(''5678'')', '^PIN_INVALID$');
select tests.expect_error('select public.set_pin(''5678'', ''0000'')', '^PIN_INVALID$');
do $$ begin
  assert public.set_pin('5678', '1234'), 'PIN 変更';
  assert (public.verify_pin('5678') ->> 'ok')::boolean, '新 PIN で verify';
end $$;
select tests.ok('set_pin / verify_pin / PIN 変更');

-- 5回失敗でロック（4回目までは ok=false + remaining、5回目で locked_until）
do $$
declare r jsonb; i int;
begin
  for i in 1..4 loop
    r := public.verify_pin('0000');
    assert not (r ->> 'ok')::boolean and (r ->> 'remaining')::int = 5 - i, format('失敗 %s 回目: remaining %s', i, r ->> 'remaining');
  end loop;
  assert (public.pin_status() ->> 'failed_count')::int = 4, 'failed_count 4';
  r := public.verify_pin('0000');
  assert not (r ->> 'ok')::boolean and (r ->> 'locked_until') is not null, '5回目でロック';
end $$;
-- ロック中は正しい PIN でも拒否
select tests.expect_error('select public.verify_pin(''5678'')', '^PIN_LOCKED$');
do $$ begin
  assert (public.pin_status() ->> 'locked_until') is not null, 'locked_until';
end $$;
select tests.ok('PIN 5回失敗で10分ロック');

-- ロック解除後（superuser で時計を進める）
select tests.logout();
update public.pin_attempts set locked_until = now() - interval '1 second', verified_at = now() - interval '6 minutes' where user_id = tests.uid('alice');
select tests.login(tests.uid('alice'));

-- ===== 決済前 PIN ゲート（サーバー側） =====
do $$ begin
  assert not (public.pin_status() ->> 'verified')::boolean, '5分経過で未認証扱い';
end $$;
select tests.expect_error(
  format('select public.pay_static(%L, 100, ''p6-pay-pinreq'')', (select id from public.merchants where name = 'Bob Cafe')),
  '^PIN_REQUIRED$');
select tests.expect_error('select public.transfer(''bob'', 100, null, ''p6-transfer-pinreq'')', '^PIN_REQUIRED$');
do $$ begin
  assert (public.verify_pin('5678') ->> 'ok')::boolean, 'verify';
  perform public.pay_static((select id from public.merchants where name = 'Bob Cafe'), 100, 'p6-pay-pinok');
  perform public.transfer('bob', 100, null, 'p6-transfer-pinok');
  assert (select count(*) from public.transactions where idempotency_key in ('p6-pay-pinok', 'p6-transfer-pinok')) = 2, 'verify 後は通る';
end $$;
-- PIN 未設定のユーザー（carol）はゲートなしで決済できる
select tests.login(tests.uid('carol'));
select public.pay_static((select id from public.merchants where name = 'Bob Cafe'), 100, 'p6-pay-carol-nopin');
-- 加盟店が読む pay_with_token はユーザーの PIN ゲート対象外（ユーザーは QR 提示時点で端末認証済みの想定）
select tests.ok('決済前 PIN ゲート：PIN 設定済みは verify_pin 後のみ決済・送金できる');

-- ===== 通知 =====
select tests.login(tests.uid('alice'));
do $$ begin
  assert (select count(*) from public.notifications where read_at is null) >= 3, '未読通知がある';
  update public.notifications set read_at = now() where read_at is null;
  assert (select count(*) from public.notifications where read_at is null) = 0, 'read_at は本人が更新できる';
end $$;
select tests.expect_error('update public.notifications set title = ''hack''', 'permission denied');
select tests.expect_error('delete from public.notifications', 'permission denied');
select tests.ok('通知：read_at のみ本人が更新可');

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
