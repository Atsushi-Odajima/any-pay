-- =============================================================================
-- 0009_admin_login.sql — 運用修正 + デモ用管理者アカウント
--   1) seed で直接 INSERT した auth.users 行のトークン系カラムが NULL だと、Supabase Auth（GoTrue）が
--      該当ユーザーを読み込めず "Database error finding user" になる。NULL を空文字に補正する
--   2) ID / パスワードでログインできるデモ用管理者（ID: kuro）。パスワードは bcrypt ハッシュのみ保存
--      ※ ポートフォリオのデモ用途。実運用ではこのアカウントを削除すること
-- =============================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'confirmation_token'
  ) then
    update auth.users set
      confirmation_token         = coalesce(confirmation_token, ''),
      recovery_token             = coalesce(recovery_token, ''),
      email_change               = coalesce(email_change, ''),
      email_change_token_new     = coalesce(email_change_token_new, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      phone_change               = coalesce(phone_change, ''),
      phone_change_token         = coalesce(phone_change_token, ''),
      reauthentication_token     = coalesce(reauthentication_token, '')
    where confirmation_token is null or recovery_token is null or email_change is null
       or email_change_token_new is null or email_change_token_current is null
       or phone_change is null or phone_change_token is null or reauthentication_token is null;
  end if;
end $$;

-- デモ用管理者（メール = kuro@any-pay.pages.dev。アプリの「ID・パスワード」ログインは ID をこのメールに変換する）
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  'a0000000-0000-4000-8000-0000000000ff', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'kuro@any-pay.pages.dev',
  '$2a$10$850JlYwP7qLiY67IvFPl7u2XiZfgMuXujaJ3pCOHGdRorPLtwvtoe', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), false,
  '', '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(), 'a0000000-0000-4000-8000-0000000000ff', 'a0000000-0000-4000-8000-0000000000ff', 'email',
  jsonb_build_object('sub', 'a0000000-0000-4000-8000-0000000000ff', 'email', 'kuro@any-pay.pages.dev', 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, handle, display_name, role)
values ('a0000000-0000-4000-8000-0000000000ff', 'kuro', 'Kuro（管理者）', 'admin')
on conflict (id) do nothing;
