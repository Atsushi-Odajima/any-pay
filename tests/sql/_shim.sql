-- =============================================================================
-- Supabase 相当の環境をローカル PostgreSQL に再現する（テスト専用。本番には流さない）
--  - ロール anon / authenticated / service_role
--  - auth スキーマ（auth.users, auth.uid()）
--  - extensions スキーマ（pgcrypto）
--  - public スキーマの default privileges（新規テーブルに ALL が付く Supabase の挙動）
--  - supabase_realtime publication
--  - tests スキーマ（ログイン切替・例外アサート）
-- =============================================================================

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
grant execute on all functions in schema extensions to anon, authenticated, service_role;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text,
  phone text unique,
  phone_confirmed_at timestamptz,
  email_confirmed_at timestamptz,
  encrypted_password text,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_anonymous boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- テスト用ヘルパー
-- ---------------------------------------------------------------------------
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- 指定ユーザーとしてログイン（authenticated ロール + JWT claim）
create or replace function tests.login(p_user_id uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);
end $$;

-- ログアウト（superuser に戻る）
create or replace function tests.logout() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  reset role;
end $$;

-- 認証ユーザーを作成し uid を返す（superuser で実行すること）
create or replace function tests.create_user(p_handle text, p_display_name text default null) returns uuid
language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, phone, phone_confirmed_at) values (v_id, '+81' || abs(hashtext(p_handle))::text, now());
  perform tests.login(v_id);
  insert into public.profiles (id, handle, display_name) values (v_id, p_handle, coalesce(p_display_name, p_handle));
  perform tests.logout();
  return v_id;
end $$;

-- handle から uid を引く（RLS を無視。DO ブロック内で psql 変数が使えないため）
create or replace function tests.uid(p_handle text) returns uuid
language plpgsql stable security definer as $$
begin
  return (select id from public.profiles where handle = p_handle);
end $$;

-- handle から user wallet id を引く（RLS を無視）
create or replace function tests.wallet_of(p_handle text) returns uuid
language plpgsql stable security definer as $$
begin
  return (select w.id from public.wallets w join public.profiles p on p.id = w.owner_id
          where p.handle = p_handle and w.kind = 'user');
end $$;

-- p_sql が p_pattern（正規表現）に一致するエラーを出すことを検証
create or replace function tests.expect_error(p_sql text, p_pattern text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm ~ p_pattern then
      return;
    end if;
    raise exception 'expected error matching "%" but got "%" for: %', p_pattern, sqlerrm, p_sql;
  end;
  raise exception 'expected error matching "%" but statement succeeded: %', p_pattern, p_sql;
end $$;

create or replace function tests.ok(p_label text) returns void
language plpgsql as $$
begin
  raise notice 'ok - %', p_label;
end $$;

grant execute on all functions in schema tests to anon, authenticated, service_role;
