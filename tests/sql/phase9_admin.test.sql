-- 運用修正: auth.users の NULL 補正 / デモ用管理者（ID・パスワード）
begin;

do $$ begin
  assert exists (
    select 1 from auth.users
    where id = 'a0000000-0000-4000-8000-0000000000ff' and email = 'kuro@any-pay.pages.dev'
      and encrypted_password like '$2a$%' and email_confirmed_at is not null
  ), '管理者の auth.users 行';
  assert (select confirmation_token from auth.users where id = 'a0000000-0000-4000-8000-0000000000ff') = '', 'トークン列は空文字';
  assert exists (
    select 1 from auth.identities where provider = 'email' and user_id = 'a0000000-0000-4000-8000-0000000000ff'
  ), 'email identity';
  assert (select role from public.profiles where handle = 'kuro') = 'admin', 'profile は admin';
  assert exists (
    select 1 from public.wallets where owner_id = 'a0000000-0000-4000-8000-0000000000ff' and kind = 'user'
  ), 'wallet が自動作成される';
end $$;
select tests.ok('デモ用管理者 kuro（auth.users / identities / profiles / wallet）');

-- seed 後もトークン列に NULL が残らない
\i supabase/seed.sql
do $$ begin
  assert not exists (
    select 1 from auth.users
    where confirmation_token is null or recovery_token is null or email_change is null
       or email_change_token_new is null or email_change_token_current is null
       or phone_change is null or phone_change_token is null or reauthentication_token is null
  ), 'seed の auth.users 行にも NULL が無い';
end $$;
select tests.ok('seed.sql は GoTrue が読める形で auth.users を作る');

-- 管理者は突合 RPC を呼べる
select tests.login('a0000000-0000-4000-8000-0000000000ff');
do $$ begin
  assert (select count(*) from public.reconcile_wallets()) = 0, '突合 OK';
  assert (public.ledger_stats() ->> 'ledger_sum')::bigint = 0, 'ledger_sum 0';
end $$;
select tests.ok('kuro は admin として reconcile_wallets / ledger_stats を実行できる');

rollback;
