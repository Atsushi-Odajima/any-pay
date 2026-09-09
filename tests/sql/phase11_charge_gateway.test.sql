-- Phase 11: チャージ API（charge_requests のライフサイクル・冪等性・権限）
begin;

select tests.create_user('alice', 'Alice');
select tests.create_user('bob', 'Bob');

-- ===== 作成（ユーザー） =====
select tests.login(tests.uid('alice'));
select (public.create_charge_request(3000, 'bank', 'sandbox', 'bank_debit', 'p11-req-1')).id as req1 \gset
do $$
declare r public.charge_requests; r2 public.charge_requests;
begin
  select * into r from public.charge_requests where idempotency_key = 'p11-req-1';
  assert r.status = 'pending' and r.amount = 3000 and r.provider = 'sandbox' and r.method = 'bank_debit', '作成';
  r2 := public.create_charge_request(9999, 'card', 'stripe', 'card', 'p11-req-1');
  assert r2.id = r.id and r2.amount = 3000, '同じ冪等キーは既存を返す（引数は無視）';
end $$;
select tests.expect_error('select public.create_charge_request(0, ''bank'', ''sandbox'', ''bank_debit'', ''p11-bad-1'')', '^INVALID_AMOUNT$');
select tests.expect_error('select public.create_charge_request(100001, ''bank'', ''sandbox'', ''bank_debit'', ''p11-bad-2'')', '^LIMIT_EXCEEDED$');
select tests.expect_error('select public.create_charge_request(100, ''crypto'', ''sandbox'', ''bank_debit'', ''p11-bad-3'')', '^INVALID_CHANNEL$');
select tests.expect_error('select public.create_charge_request(100, ''bank'', ''Bad Provider'', ''bank_debit'', ''p11-bad-4'')', '^INVALID_METHOD$');
select tests.expect_error('select public.create_charge_request(100, ''bank'', ''sandbox'', ''bank_debit'', ''short'')', '^INVALID_IDEMPOTENCY_KEY$');
select tests.ok('create_charge_request：作成・冪等・検証');

-- ===== RLS / 権限 =====
select tests.login(tests.uid('bob'));
do $$ begin
  assert (select count(*) from public.charge_requests) = 0, 'bob には alice のリクエストが見えない';
end $$;
select tests.expect_error(format('select public.cancel_charge_request(%L)', :'req1'), '^CHARGE_NOT_FOUND$');
select tests.login(tests.uid('alice'));
select tests.expect_error(format('update public.charge_requests set amount = 1 where id = %L', :'req1'), 'permission denied');
select tests.expect_error(format('select public.attach_charge_provider(%L, ''sbx_x'')', :'req1'), 'permission denied');
select tests.expect_error(format('select public.complete_charge_request(%L)', :'req1'), 'permission denied');
select tests.expect_error(format('select public.fail_charge_request(%L)', :'req1'), 'permission denied');
select tests.expect_error('select * from public.sandbox_payments', 'permission denied');
select tests.ok('他人の行は不可視 / クライアントは更新・状態遷移 RPC・sandbox 表にアクセスできない');

-- ===== service_role：プロバイダ紐づけ → 確定 → 記帳 =====
select tests.logout();
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
do $$
declare r public.charge_requests; r2 public.charge_requests; tx public.transactions;
begin
  r := public.attach_charge_provider((select id from public.charge_requests where idempotency_key = 'p11-req-1'),
         'sbx_001', 'https://sandbox.example/checkout/sbx_001', null, 'pending', now() + interval '20 minutes');
  assert r.provider_ref = 'sbx_001' and r.redirect_url like 'https://sandbox%', 'attach';
  r := public.complete_charge_request(r.id, 'sbx_001', '{"event":"payment.paid"}');
  assert r.status = 'completed' and r.transaction_id is not null and r.completed_at is not null, 'completed';
  select * into tx from public.transactions where id = r.transaction_id;
  assert tx.type = 'charge' and tx.amount = 3000 and tx.idempotency_key = 'charge_request:' || r.id::text, '取引';
  assert (tx.metadata ->> 'method') = 'bank_debit' and (tx.metadata ->> 'provider') = 'sandbox' and (tx.metadata ->> 'provider_ref') = 'sbx_001', 'metadata';
  assert (r.metadata -> 'provider_payload' ->> 'event') = 'payment.paid', 'provider_payload';
  -- 再送：同じ行を返し、取引は増えない
  r2 := public.complete_charge_request(r.id, 'sbx_001');
  assert r2.transaction_id = r.transaction_id, '再送は同じ取引';
  assert (select count(*) from public.transactions where idempotency_key = 'charge_request:' || r.id::text) = 1, '取引は1件';
  -- 別の provider_ref で確定しようとすると拒否（completed なのでそのまま返る前に検査されない → 新規リクエストで検査）
  assert (select count(*) from public.notifications where type = 'charge_completed' and user_id = tests.uid('alice')) = 1, '完了通知';
  assert (select (data ->> 'amount')::bigint from public.notifications where type = 'charge_completed' limit 1) = 3000, '通知 data.amount';
end $$;
reset role;
select set_config('request.jwt.claim.role', '', true);
select tests.login(tests.uid('alice'));
do $$ begin
  assert (select balance_cache from public.wallets where owner_id = tests.uid('alice') and kind = 'user') = 3000, '残高 3000';
  assert (select status from public.charge_requests where idempotency_key = 'p11-req-1') = 'completed', '本人から completed が見える';
end $$;
select tests.expect_error(format('select public.cancel_charge_request(%L)', :'req1'), '^CHARGE_NOT_PENDING$');
select tests.ok('attach → complete で記帳。再送は二重計上なし。完了後はキャンセル不可');

-- ===== 拒否 / キャンセル / provider_ref 不一致 =====
select (public.create_charge_request(500, 'card', 'sandbox', 'card', 'p11-req-2')).id as req2 \gset
select (public.create_charge_request(700, 'emoney', 'sandbox', 'wallet', 'p11-req-3')).id as req3 \gset
select (public.create_charge_request(900, 'emoney', 'sandbox', 'konbini', 'p11-req-4')).id as req4 \gset
do $$
declare r public.charge_requests;
begin
  r := public.cancel_charge_request((select id from public.charge_requests where idempotency_key = 'p11-req-3'));
  assert r.status = 'cancelled' and r.failure_code = 'CANCELLED', 'ユーザーがキャンセル';
  r := public.cancel_charge_request(r.id);
  assert r.status = 'cancelled', 'キャンセルは冪等';
end $$;
select tests.logout();
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
do $$
declare r public.charge_requests;
begin
  -- 拒否
  r := public.attach_charge_provider((select id from public.charge_requests where idempotency_key = 'p11-req-2'), 'sbx_002');
  r := public.fail_charge_request(r.id, 'PROVIDER_DECLINED', '{"event":"payment.declined"}');
  assert r.status = 'failed' and r.failure_code = 'PROVIDER_DECLINED', 'declined';
  assert (select count(*) from public.notifications where type = 'charge_failed') = 1, '失敗通知';
  -- 失敗後に確定通知が来ても記帳しない
  begin
    perform public.complete_charge_request(r.id, 'sbx_002');
    raise exception 'should not reach';
  exception when others then
    assert sqlerrm = 'CHARGE_NOT_PENDING', 'failed → complete は CHARGE_NOT_PENDING: ' || sqlerrm;
  end;
  -- キャンセル済みに fail が来ても変わらない
  r := public.fail_charge_request((select id from public.charge_requests where idempotency_key = 'p11-req-3'), 'EXPIRED');
  assert r.status = 'cancelled', 'cancelled は上書きしない';
  -- provider_ref 不一致
  r := public.attach_charge_provider((select id from public.charge_requests where idempotency_key = 'p11-req-4'), 'sbx_004', null,
         '{"payment_code":"1234-5678"}', 'processing');
  assert r.status = 'processing' and (r.instructions ->> 'payment_code') = '1234-5678', 'instructions / processing';
  begin
    perform public.complete_charge_request(r.id, 'sbx_999');
    raise exception 'should not reach';
  exception when others then
    assert sqlerrm = 'PROVIDER_REF_MISMATCH', 'ref mismatch: ' || sqlerrm;
  end;
  -- 期限切れ扱いでも「入金済み」通知が来たら記帳する（お金は動いているため）
  r := public.fail_charge_request(r.id, 'EXPIRED');
  assert r.status = 'expired', 'expired';
  r := public.complete_charge_request(r.id, 'sbx_004');
  assert r.status = 'completed', 'expired → completed は許可';
  assert (select count(*) from public.transactions where type = 'charge') = 2, '取引 2 件';
end $$;
reset role;
select set_config('request.jwt.claim.role', '', true);
select tests.ok('拒否 / キャンセル / provider_ref 不一致 / 期限切れ後の入金');

-- ===== 未完了リクエスト数の上限と自動期限切れ =====
select tests.login(tests.uid('alice'));
select public.create_charge_request(100, 'bank', 'sandbox', 'bank_debit', 'p11-pend-1');
select public.create_charge_request(100, 'bank', 'sandbox', 'bank_debit', 'p11-pend-2');
select public.create_charge_request(100, 'bank', 'sandbox', 'bank_debit', 'p11-pend-3');
select public.create_charge_request(100, 'bank', 'sandbox', 'bank_debit', 'p11-pend-4');
select public.create_charge_request(100, 'bank', 'sandbox', 'bank_debit', 'p11-pend-5');
select tests.expect_error('select public.create_charge_request(100, ''bank'', ''sandbox'', ''bank_debit'', ''p11-pend-6'')', '^TOO_MANY_PENDING_CHARGES$');
select tests.logout();
update public.charge_requests set expires_at = now() - interval '1 minute' where idempotency_key like 'p11-pend-%';
select tests.login(tests.uid('alice'));
do $$ begin
  perform public.create_charge_request(100, 'bank', 'sandbox', 'bank_debit', 'p11-pend-6');
  assert (select count(*) from public.charge_requests where status = 'expired' and idempotency_key like 'p11-pend-%') = 5, '期限切れは expired に';
end $$;
select tests.ok('未完了 5 件で TOO_MANY_PENDING_CHARGES。期限切れは作成時に expired へ');

-- ===== 記帳時の残高上限：failed にして返す（例外にしない） =====
select tests.login(tests.uid('bob'));
select public.charge_wallet(100000, 'bank', 'p11-bob-c1');
select public.charge_wallet(100000, 'bank', 'p11-bob-c2');
select public.charge_wallet(100000, 'bank', 'p11-bob-c3');
select public.charge_wallet(100000, 'bank', 'p11-bob-c4');
select public.charge_wallet(100000, 'bank', 'p11-bob-c5');
select public.charge_wallet(100000, 'bank', 'p11-bob-c6');
select public.charge_wallet(100000, 'bank', 'p11-bob-c7');
select public.charge_wallet(100000, 'bank', 'p11-bob-c8');
select public.charge_wallet(100000, 'bank', 'p11-bob-c9');
select public.charge_wallet(80000, 'bank', 'p11-bob-c10');
select tests.expect_error('select public.create_charge_request(30000, ''card'', ''sandbox'', ''card'', ''p11-bob-over'')', '^LIMIT_EXCEEDED$');
select (public.create_charge_request(20000, 'card', 'sandbox', 'card', 'p11-bob-cap')).id as bobreq \gset
select public.charge_wallet(20000, 'bank', 'p11-bob-c11');   -- 上限ぴったりまで埋める
select tests.logout();
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
do $$
declare r public.charge_requests;
begin
  r := public.attach_charge_provider((select id from public.charge_requests where idempotency_key = 'p11-bob-cap'), 'sbx_cap');
  r := public.complete_charge_request(r.id, 'sbx_cap');
  assert r.status = 'failed' and r.failure_code = 'LIMIT_EXCEEDED', '記帳時の上限超過は failed: ' || coalesce(r.failure_code, 'null');
  assert (select balance_cache from public.wallets where owner_id = tests.uid('bob') and kind = 'user') = 1000000, '残高は変わらない';
end $$;
reset role;
select set_config('request.jwt.claim.role', '', true);
select tests.ok('記帳時の残高上限超過は failed（残高不変・例外なし）');

-- ===== 台帳整合 =====
select tests.logout();
do $$ begin
  assert (select coalesce(sum(amount), 0) from public.ledger_entries) = 0, '台帳合計 0';
  assert not exists (
    select 1 from public.wallets w
    where w.balance_cache <> (select coalesce(sum(l.amount), 0) from public.ledger_entries l where l.wallet_id = w.id)
  ), 'balance_cache = sum(ledger)';
end $$;
select tests.ok('台帳整合');

rollback;
