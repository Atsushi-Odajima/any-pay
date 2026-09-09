-- Phase 1: RLS と権限の検証
begin;

select tests.create_user('alice', 'Alice');
select tests.create_user('bob', 'Bob');

-- profiles INSERT で user wallet が自動作成される
select tests.login(tests.uid('alice'));
do $$ begin
  assert (select count(*) from public.wallets) = 1, 'alice は自分の wallet だけ見える';
  assert (select kind from public.wallets) = 'user', 'kind = user';
  assert (select balance_cache from public.wallets) = 0, '初期残高 0';
end $$;
select tests.ok('profiles INSERT → wallets 自動作成');

-- 他人の profile / wallet は見えない
do $$ begin
  assert (select count(*) from public.profiles) = 1, '自分の profile だけ';
  assert (select count(*) from public.profiles where id = tests.uid('bob')) = 0, 'bob の profile は見えない';
  assert (select count(*) from public.wallets where owner_id = tests.uid('bob')) = 0, 'bob の wallet は見えない';
end $$;
select tests.ok('他人の profile / wallet が見えない');

-- public_profiles 経由なら検索できる（pin_hash / role は露出しない）
do $$ begin
  assert (select count(*) from public.public_profiles where handle = 'bob') = 1, 'public_profiles で bob を検索できる';
  assert not exists (
    select 1 from information_schema.columns
    where table_name = 'public_profiles' and column_name in ('pin_hash', 'role')
  ), 'public_profiles に pin_hash / role がない';
end $$;
select tests.ok('public_profiles で相手を検索できる');

-- クライアントから wallets を UPDATE / INSERT / DELETE できない
select tests.expect_error('update public.wallets set balance_cache = 999999', 'permission denied');
select tests.expect_error(
  format('insert into public.wallets (owner_id, kind) values (%L, ''user'')', tests.uid('alice')), 'permission denied');
select tests.expect_error('delete from public.wallets', 'permission denied');
select tests.ok('wallets への直接書き込みが拒否される');

-- transactions / ledger_entries / point_entries への直接書き込みも不可
select tests.expect_error(
  format('insert into public.transactions (type, amount, idempotency_key, created_by) values (''charge'', 100, ''x'', %L)', tests.uid('alice')),
  'permission denied');
select tests.expect_error('insert into public.ledger_entries (transaction_id, wallet_id, amount, balance_after) values (gen_random_uuid(), gen_random_uuid(), 1, 1)', 'permission denied');
select tests.expect_error(format('insert into public.point_entries (user_id, delta, reason) values (%L, 100, ''hack'')', tests.uid('alice')), 'permission denied');
select tests.expect_error('delete from public.ledger_entries', 'permission denied');
select tests.ok('transactions / ledger_entries / point_entries への直接書き込みが拒否される');

-- role / pin_hash は直接更新できない（列権限）
select tests.expect_error('update public.profiles set role = ''admin''', 'permission denied');
select tests.expect_error('update public.profiles set pin_hash = ''x''', 'permission denied');
update public.profiles set display_name = 'Alice 2';
do $$ begin
  assert (select display_name from public.profiles) = 'Alice 2', 'display_name は本人が更新できる';
end $$;
select tests.ok('role / pin_hash は直接更新不可、display_name は可');

-- 他人になりすまして profile を作れない
select tests.expect_error(
  format('insert into public.profiles (id, handle, display_name) values (%L, ''evil'', ''Evil'')', gen_random_uuid()),
  'row-level security');
select tests.ok('他人 id で profile を作れない');

-- handle の形式チェック
select tests.logout();
select tests.expect_error(
  format('insert into public.profiles (id, handle, display_name) values (%L, ''Bad Handle!'', ''x'')', gen_random_uuid()),
  'violates check constraint');
select tests.ok('handle 形式チェック');

-- 内部関数は呼べない
select tests.login(tests.uid('bob'));
select tests.expect_error('select public._uid()', 'permission denied');
select tests.ok('内部関数 _uid() は直接呼べない');

-- anon は何も見えない
select tests.logout();
set local role anon;
select tests.expect_error('select * from public.profiles', 'permission denied');
select tests.expect_error('select * from public.wallets', 'permission denied');
select tests.ok('anon はテーブルにアクセスできない');

rollback;
