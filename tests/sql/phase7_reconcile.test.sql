-- Phase 7: 突合 / seed
begin;

-- seed.sql をそのまま流せる（Supabase の db reset 相当）
\i supabase/seed.sql

do $$ begin
  assert (select count(*) from public.profiles) = 5, 'ユーザー5';
  assert (select count(*) from public.merchants) = 2, '加盟店2';
  assert (select count(*) from public.coupons) = 4, 'クーポン4';
  assert (select count(*) from public.transactions) >= 6, '取引あり';
  assert (select sum(amount) from public.ledger_entries) = 0, 'ledger 合計 0';
end $$;
select tests.ok('seed.sql が投入できる');

-- 非 admin は突合できない
select tests.login('a0000000-0000-4000-8000-000000000002');
select tests.expect_error('select * from public.reconcile_wallets()', '^NOT_ADMIN$');
select tests.expect_error('select public.ledger_stats()', '^NOT_ADMIN$');
select tests.ok('reconcile_wallets / ledger_stats は admin のみ');

-- admin：不一致なし
select tests.login('a0000000-0000-4000-8000-000000000001');
do $$ begin
  assert (select count(*) from public.reconcile_wallets()) = 0, '不一致なし';
  assert (public.ledger_stats() ->> 'ledger_sum')::bigint = 0, 'ledger_sum 0';
  assert (public.ledger_stats() ->> 'treasury_balance')::bigint = -(30000 + 10000 + 5000), 'treasury = -チャージ合計';
end $$;
select tests.ok('突合：不一致なし');

-- 不一致を人為的に作る（superuser が balance_cache を直接いじる）→ 検出される
select tests.logout();
update public.wallets set balance_cache = balance_cache + 1 where owner_id = 'a0000000-0000-4000-8000-000000000002' and kind = 'user';
select tests.login('a0000000-0000-4000-8000-000000000001');
do $$
declare r record;
begin
  select * into r from public.reconcile_wallets();
  assert r.owner_handle = 'bob' and r.diff = 1, 'bob の wallet が +1 で検出される';
  assert (select count(*) from public.reconcile_wallets()) = 1, '不一致は1件';
end $$;
select tests.ok('突合：balance_cache の改ざんを検出');

rollback;
