-- Phase 2: 台帳・冪等性・残高制約
begin;

select tests.create_user('alice', 'Alice');
select tests.create_user('bob', 'Bob');

-- (a) 同一 idempotency_key の2回呼び出しは1取引
select tests.login(tests.uid('alice'));
do $$
declare t1 public.transactions; t2 public.transactions;
begin
  t1 := public.charge_wallet(10000, 'bank', 'charge-key-0001');
  t2 := public.charge_wallet(10000, 'bank', 'charge-key-0001');
  assert t1.id = t2.id, '同じ transaction が返る';
  assert (select count(*) from public.transactions where idempotency_key = 'charge-key-0001') = 1, '取引は1件';
  assert (select balance_cache from public.wallets where kind = 'user') = 10000, '残高は1回分だけ増える';
  assert t1.status = 'completed' and t1.type = 'charge', 'completed / charge';
  assert (t1.metadata ->> 'method') = 'bank', 'metadata.method';
end $$;
select tests.ok('(a) 同一 idempotency_key → 1取引');

-- 同じキーで違う金額は拒否（キーの使い回し検出）
select tests.expect_error('select public.charge_wallet(20000, ''bank'', ''charge-key-0001'')', '^IDEMPOTENCY_KEY_CONFLICT$');
select tests.ok('同一キー・異なる金額は IDEMPOTENCY_KEY_CONFLICT');

-- 他人のキーは使えない
select tests.login(tests.uid('bob'));
select tests.expect_error('select public.charge_wallet(10000, ''bank'', ''charge-key-0001'')', '^IDEMPOTENCY_KEY_CONFLICT$');
select tests.ok('他人の idempotency_key は IDEMPOTENCY_KEY_CONFLICT');

-- ledger の balance_after と合計0
select tests.login(tests.uid('alice'));
do $$
declare v_wallet uuid := (select id from public.wallets where kind = 'user');
begin
  assert (select count(*) from public.ledger_entries where wallet_id = v_wallet) = 1, '自分の ledger 行が1件';
  assert (select amount from public.ledger_entries where wallet_id = v_wallet) = 10000, '+10000';
  assert (select balance_after from public.ledger_entries where wallet_id = v_wallet) = 10000, 'balance_after = 10000';
  -- treasury の行は RLS で見えない
  assert (select count(*) from public.ledger_entries) = 1, 'treasury の行は見えない';
end $$;
select tests.logout();
do $$ begin
  assert (select sum(amount) from public.ledger_entries) = 0, '全 ledger の合計は 0';
  assert (select balance_cache from public.wallets where kind = 'system') = -10000, 'treasury は -10000';
end $$;
select tests.ok('balance_after / 二重記帳の合計0');

-- (b) 合計0違反は拒否される（superuser が直接 INSERT しても）
do $$
declare v_tx uuid; v_wallet uuid := tests.wallet_of('alice');
begin
  -- サブトランザクション内で片側だけの仕訳を入れ、制約を即時評価する（失敗で全体が巻き戻る）
  begin
    insert into public.transactions (type, status, amount, from_wallet_id, to_wallet_id, idempotency_key, created_by)
    values ('charge', 'completed', 500, public._treasury_id(), v_wallet, 'unbalanced-key-01', tests.uid('alice'))
    returning id into v_tx;
    insert into public.ledger_entries (transaction_id, wallet_id, amount, balance_after) values (v_tx, v_wallet, 500, 10500);
    set constraints all immediate;
    raise exception 'NO_ERROR';
  exception when others then
    assert sqlerrm = 'LEDGER_UNBALANCED', 'LEDGER_UNBALANCED が発生する: ' || sqlerrm;
  end;
  assert (select count(*) from public.transactions where idempotency_key = 'unbalanced-key-01') = 0, '不整合な取引は残らない';
end $$;
select tests.ok('(b) 合計0違反は LEDGER_UNBALANCED');

-- ledger_entries は追記専用（superuser でも UPDATE / DELETE 不可）
select tests.expect_error('update public.ledger_entries set amount = amount + 1', '^LEDGER_IMMUTABLE$');
select tests.expect_error('delete from public.ledger_entries', '^LEDGER_IMMUTABLE$');
select tests.ok('ledger_entries は UPDATE / DELETE 不可');

-- (c) 残高不足は拒否
select tests.login(tests.uid('alice'));
select tests.expect_error('select public.withdraw(10001, ''withdraw-key-0001'')', '^INSUFFICIENT_FUNDS$');
do $$ begin
  assert (select balance_cache from public.wallets where kind = 'user') = 10000, '失敗時は残高が変わらない';
  assert (select count(*) from public.transactions where idempotency_key = 'withdraw-key-0001') = 0, '失敗した取引は残らない';
end $$;
select tests.ok('(c) 残高不足は INSUFFICIENT_FUNDS');

-- 出金成功
do $$
declare t public.transactions;
begin
  t := public.withdraw(4000, 'withdraw-key-0002');
  assert t.type = 'withdrawal' and t.amount = 4000, 'withdrawal 4000';
  assert (select balance_cache from public.wallets where kind = 'user') = 6000, '残高 6000';
  assert (select balance_after from public.ledger_entries where transaction_id = t.id and wallet_id = t.from_wallet_id) = 6000, 'balance_after 6000';
end $$;
select tests.ok('withdraw 成功 → 残高 6000');

-- (d) 上限超過は拒否
select tests.expect_error('select public.charge_wallet(100001, ''card'', ''charge-key-0002'')', '^LIMIT_EXCEEDED$');
select tests.expect_error('select public.charge_wallet(0, ''card'', ''charge-key-0003'')', '^INVALID_AMOUNT$');
select tests.expect_error('select public.charge_wallet(100, ''bitcoin'', ''charge-key-0004'')', '^INVALID_METHOD$');
select tests.ok('(d) 1回 100,000 円超 / 0 円 / 不正な方法は拒否');

-- 残高上限 1,000,000 円
do $$
declare i int;
begin
  for i in 1..9 loop
    perform public.charge_wallet(100000, 'bank', 'charge-cap-' || i);
  end loop;
  assert (select balance_cache from public.wallets where kind = 'user') = 906000, '906,000 円';
end $$;
select tests.expect_error('select public.charge_wallet(94001, ''bank'', ''charge-cap-over'')', '^LIMIT_EXCEEDED$');
select public.charge_wallet(94000, 'bank', 'charge-cap-exact');
do $$ begin
  assert (select balance_cache from public.wallets where kind = 'user') = 1000000, 'ちょうど 1,000,000 円は可';
end $$;
select tests.expect_error('select public.charge_wallet(1, ''bank'', ''charge-cap-over-1'')', '^LIMIT_EXCEEDED$');
select tests.ok('(d) 残高上限 1,000,000 円');

-- 他人の wallet からは出金できない
select tests.login(tests.uid('bob'));
select tests.expect_error(
  format('select public.withdraw(100, ''withdraw-key-bob-1'', %L)', tests.wallet_of('alice')),
  '^WALLET_NOT_FOUND$');
select tests.ok('他人の wallet からの出金は WALLET_NOT_FOUND');

-- 未認証は拒否
select tests.logout();
set local role authenticated;
select tests.expect_error('select public.charge_wallet(100, ''bank'', ''charge-key-anon'')', '^NOT_AUTHENTICATED$');
select tests.ok('未認証は NOT_AUTHENTICATED');

-- 内部関数は直接呼べない
select tests.login(tests.uid('bob'));
select tests.expect_error(
  format('select public._post_transaction(''charge'', %L, %L, 100, ''hack-key-000001'', %L)',
    '00000000-0000-0000-0000-000000000001', tests.wallet_of('bob'), tests.uid('bob')),
  'permission denied');
select tests.ok('_post_transaction は直接呼べない');

-- balance_cache と ledger 合計の整合
select tests.logout();
do $$ begin
  assert not exists (
    select 1 from public.wallets w
    left join (select wallet_id, sum(amount) s from public.ledger_entries group by wallet_id) l on l.wallet_id = w.id
    where w.balance_cache <> coalesce(l.s, 0)
  ), 'balance_cache = sum(ledger)';
end $$;
select tests.ok('balance_cache と ledger 合計が一致');

rollback;
