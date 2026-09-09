-- Phase 3: QR決済（ユーザー提示 / 動的 / 静的）
begin;

select tests.create_user('alice', 'Alice');
select tests.create_user('bob', 'Bob');
select tests.create_user('carol', 'Carol');

-- alice にチャージ、bob が店舗登録
select tests.login(tests.uid('alice'));
select public.charge_wallet(10000, 'bank', 'p3-charge-alice');
select tests.login(tests.uid('bob'));
do $$
declare m public.merchants;
begin
  m := public.register_merchant('Bob Cafe', 'cafe', 'Tokyo');
  assert m.name = 'Bob Cafe', '店舗名';
  assert (select role from public.profiles where id = tests.uid('bob')) = 'merchant', 'role が merchant になる';
  assert (select count(*) from public.wallets where owner_id = tests.uid('bob') and kind = 'merchant') = 1, 'merchant wallet 作成';
end $$;
select tests.expect_error('select public.register_merchant(''Second'')', '^MERCHANT_ALREADY_REGISTERED$');
select tests.ok('register_merchant');

-- ===== ユーザー提示型 =====
select tests.login(tests.uid('alice'));
create temp table t_tok as select public.create_qr_token() as j;
do $$
declare j jsonb := (select j from t_tok);
begin
  assert length(j ->> 'token') >= 40, 'token は 32byte base64url';
  assert (j ->> 'expires_at')::timestamptz > now() + interval '50 seconds', '60秒有効';
  assert (select count(*) from public.qr_tokens where used_at is null and expires_at > now()) = 1, '有効トークン1件';
end $$;
-- 再発行で前のトークンは失効する
create temp table t_tok2 as select public.create_qr_token() as j;
do $$ begin
  assert (select count(*) from public.qr_tokens where used_at is null and expires_at > now()) = 1, '再発行後も有効トークンは1件';
end $$;
select tests.ok('create_qr_token: 発行と前トークンの失効');

-- 古いトークンは使えない
select tests.login(tests.uid('bob'));
select tests.expect_error(
  format('select public.pay_with_token(%L, 500, %L, ''p3-pay-old-token'')', (select j ->> 'token' from t_tok), (select id from public.merchants where owner_id = tests.uid('bob'))),
  '^TOKEN_EXPIRED$');
-- 偽トークン
select tests.expect_error(
  format('select public.pay_with_token(''forged-token'', 500, %L, ''p3-pay-forged'')', (select id from public.merchants where owner_id = tests.uid('bob'))),
  '^TOKEN_INVALID$');
select tests.ok('失効トークン / 偽トークンは拒否');

-- 加盟店オーナー以外は pay_with_token を呼べない
select tests.login(tests.uid('carol'));
select tests.expect_error(
  format('select public.pay_with_token(%L, 500, %L, ''p3-pay-carol'')', (select j ->> 'token' from t_tok2), (select id from public.merchants where name = 'Bob Cafe')),
  '^NOT_MERCHANT_OWNER$');
select tests.ok('他人（非オーナー）はトークン決済できない');

-- 正常決済
select tests.login(tests.uid('bob'));
do $$
declare
  tx public.transactions;
  m_id uuid := (select id from public.merchants where owner_id = tests.uid('bob'));
  tok text := (select j ->> 'token' from t_tok2);
begin
  tx := public.pay_with_token(tok, 1500, m_id, 'p3-pay-token-1');
  assert tx.type = 'payment' and tx.amount = 1500 and tx.merchant_id = m_id, 'payment 1500';
  assert tx.created_by = tests.uid('bob'), 'created_by は呼び出した加盟店オーナー';
  assert (tx.metadata ->> 'payment_method') = 'user_presented', 'metadata.payment_method';
  assert (tx.metadata ->> 'payer_handle') = 'alice', 'metadata.payer_handle';
  assert (tx.metadata ->> 'points')::int = 7, '1500 * 0.5% = 7pt';
  assert (select balance_cache from public.wallets where owner_id = tests.uid('bob') and kind = 'merchant') = 1500, '店舗残高 1500';
  -- 冪等リプレイ（トークンが使用済みでも同じ取引が返る）
  assert (public.pay_with_token(tok, 1500, m_id, 'p3-pay-token-1')).id = tx.id, 'リプレイは同じ取引';
end $$;
select tests.ok('pay_with_token 成功 + 冪等リプレイ');

-- 二重使用
select tests.expect_error(
  format('select public.pay_with_token(%L, 500, %L, ''p3-pay-token-2'')', (select j ->> 'token' from t_tok2), (select id from public.merchants where owner_id = tests.uid('bob'))),
  '^TOKEN_USED$');
select tests.ok('使用済みトークンは TOKEN_USED');

-- 支払い側の残高・ポイント・通知
select tests.login(tests.uid('alice'));
do $$ begin
  assert (select balance_cache from public.wallets where kind = 'user') = 8500, 'alice 残高 8500';
  assert (select balance from public.point_balances) = 7, 'alice 7pt';
  assert (select count(*) from public.notifications where type = 'payment_sent') = 1, '支払い通知';
  assert (select count(*) from public.qr_tokens where used_at is not null) = 1, 'used_at が付く';
end $$;
select tests.login(tests.uid('bob'));
do $$ begin
  assert (select count(*) from public.notifications where type = 'payment_received') = 1, '受付通知';
  -- 加盟店オーナーは自店の取引を見られる
  assert (select count(*) from public.transactions where type = 'payment') = 1, '自店の取引が見える';
end $$;
select tests.ok('残高 / ポイント / 通知 / RLS');

-- 期限切れトークン
select tests.login(tests.uid('alice'));
create temp table t_tok3 as select public.create_qr_token() as j;
select tests.logout();
update public.qr_tokens set expires_at = now() - interval '1 second' where token = (select j ->> 'token' from t_tok3);
select tests.login(tests.uid('bob'));
select tests.expect_error(
  format('select public.pay_with_token(%L, 500, %L, ''p3-pay-expired'')', (select j ->> 'token' from t_tok3), (select id from public.merchants where owner_id = tests.uid('bob'))),
  '^TOKEN_EXPIRED$');
select tests.ok('期限切れトークンは TOKEN_EXPIRED');

-- 残高不足（alice 8500）
select tests.login(tests.uid('alice'));
create temp table t_tok4 as select public.create_qr_token() as j;
select tests.login(tests.uid('bob'));
select tests.expect_error(
  format('select public.pay_with_token(%L, 9000, %L, ''p3-pay-insufficient'')', (select j ->> 'token' from t_tok4), (select id from public.merchants where owner_id = tests.uid('bob'))),
  '^INSUFFICIENT_FUNDS$');
do $$ begin
  -- 失敗時はトークンが消費されない
  assert (select used_at from public.qr_tokens where token = (select j ->> 'token' from t_tok4)) is null;
end $$;
select tests.ok('残高不足は INSUFFICIENT_FUNDS（トークンは未消費）');

-- ===== 動的QR =====
select tests.login(tests.uid('bob'));
create temp table t_req as select public.create_payment_request(800, 'コーヒー') as r;
do $$
declare r public.payment_requests := (select r from t_req);
begin
  assert r.status = 'open' and r.amount = 800 and r.memo = 'コーヒー', 'open / 800';
  assert r.expires_at > now() + interval '4 minutes', '5分有効';
end $$;
select tests.login(tests.uid('alice'));
do $$
declare
  j jsonb := public.get_payment_request((select (r).id from t_req));
  tx public.transactions;
begin
  assert (j ->> 'merchant_name') = 'Bob Cafe' and (j ->> 'amount')::bigint = 800 and (j ->> 'status') = 'open', 'get_payment_request';
  tx := public.pay_request((select (r).id from t_req), 'p3-pay-req-1');
  assert tx.amount = 800 and (tx.metadata ->> 'payment_method') = 'merchant_dynamic', 'pay_request';
  assert tx.memo = 'コーヒー', 'memo 引き継ぎ';
  assert (public.get_payment_request((select (r).id from t_req)) ->> 'status') = 'paid', 'paid になる';
  assert (public.pay_request((select (r).id from t_req), 'p3-pay-req-1')).id = tx.id, 'リプレイ';
  assert (select balance_cache from public.wallets where kind = 'user') = 7700, 'alice 残高 7700';
end $$;
select tests.expect_error(format('select public.pay_request(%L, ''p3-pay-req-2'')', (select (r).id from t_req)), '^REQUEST_NOT_OPEN$');
select tests.expect_error(format('select public.pay_request(%L, ''p3-pay-req-3'')', gen_random_uuid()), '^REQUEST_NOT_FOUND$');
select tests.ok('pay_request 成功 / 二重支払い拒否');

-- 期限切れリクエスト
select tests.login(tests.uid('bob'));
create temp table t_req2 as select public.create_payment_request(300) as r;
select tests.logout();
update public.payment_requests set expires_at = now() - interval '1 second' where id = (select (r).id from t_req2);
select tests.login(tests.uid('alice'));
select tests.expect_error(format('select public.pay_request(%L, ''p3-pay-req-exp'')', (select (r).id from t_req2)), '^REQUEST_EXPIRED$');
do $$ begin
  assert (public.get_payment_request((select (r).id from t_req2)) ->> 'status') = 'expired', 'status は expired と見える';
end $$;
select tests.ok('期限切れリクエストは REQUEST_EXPIRED');

-- キャンセル
select tests.login(tests.uid('bob'));
create temp table t_req3 as select public.create_payment_request(300) as r;
select tests.login(tests.uid('alice'));
select tests.expect_error(format('select public.cancel_payment_request(%L)', (select (r).id from t_req3)), '^NOT_MERCHANT_OWNER$');
select tests.login(tests.uid('bob'));
do $$ begin
  assert (public.cancel_payment_request((select (r).id from t_req3))).status = 'cancelled';
end $$;
select tests.login(tests.uid('alice'));
select tests.expect_error(format('select public.pay_request(%L, ''p3-pay-req-cancel'')', (select (r).id from t_req3)), '^REQUEST_NOT_OPEN$');
select tests.ok('cancel_payment_request（オーナーのみ）');

-- ===== 静的QR =====
do $$
declare tx public.transactions; m_id uuid := (select id from public.merchants where name = 'Bob Cafe');
begin
  tx := public.pay_static(m_id, 300, 'p3-pay-static-1');
  assert tx.amount = 300 and (tx.metadata ->> 'payment_method') = 'merchant_static', 'pay_static';
  assert (select balance_cache from public.wallets where kind = 'user') = 7400, 'alice 残高 7400';
end $$;
select tests.expect_error(format('select public.pay_static(%L, 300, ''p3-pay-static-2'')', gen_random_uuid()), '^MERCHANT_NOT_FOUND$');
select tests.expect_error(format('select public.pay_static(%L, 0, ''p3-pay-static-3'')', (select id from public.merchants where name = 'Bob Cafe')), '^INVALID_AMOUNT$');
select tests.ok('pay_static 成功 / 不正入力拒否');

-- ===== レート制限 20回/分 =====
do $$
declare i int; m_id uuid := (select id from public.merchants where name = 'Bob Cafe');
begin
  -- ここまでで alice は 3 回決済済み → 17 回で 20 回
  for i in 1..17 loop
    perform public.pay_static(m_id, 1, 'p3-rate-' || i);
  end loop;
end $$;
select tests.expect_error(format('select public.pay_static(%L, 1, ''p3-rate-over'')', (select id from public.merchants where name = 'Bob Cafe')), '^RATE_LIMITED$');
select tests.ok('決済回数 20回/分 を超えると RATE_LIMITED');

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
