-- =============================================================================
-- seed.sql — デモデータ（`supabase db reset` で投入。本番には流さない）
--   ユーザー3（alice は admin 兼用）・加盟店2・クーポン数点・取引いくつか
--   電話番号は config.toml の [auth.sms.test_otp] と対応（OTP は 123456）
-- =============================================================================

-- auth.users（Supabase の内部テーブル。Phone 認証のテストユーザー）
insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '819000000001', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now(), false),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '819000000002', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now(), false),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '819000000003', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now(), false),
  ('a0000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '819000000011', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now(), false),
  ('a0000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '819000000012', now(), '{"provider":"phone","providers":["phone"]}', '{}', now(), now(), false)
on conflict (id) do nothing;

-- profiles（INSERT トリガーで user wallet が自動作成される）
insert into public.profiles (id, handle, display_name, role) values
  ('a0000000-0000-4000-8000-000000000001', 'alice', 'Alice（管理者）', 'admin'),
  ('a0000000-0000-4000-8000-000000000002', 'bob', 'Bob', 'user'),
  ('a0000000-0000-4000-8000-000000000003', 'carol', 'Carol', 'user'),
  ('a0000000-0000-4000-8000-000000000011', 'yuki_coffee', 'Yuki（Any Coffee）', 'user'),
  ('a0000000-0000-4000-8000-000000000012', 'ren_books', 'Ren（Book & Bean）', 'user')
on conflict (id) do nothing;

-- RPC を「そのユーザーとして」呼ぶためのヘルパー（seed 内限定）
create or replace function pg_temp.as_user(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_uid::text, true);
$$;

-- 加盟店登録
select pg_temp.as_user('a0000000-0000-4000-8000-000000000011');
select public.register_merchant('Any Coffee 渋谷店', 'カフェ', '東京都渋谷区道玄坂 1-2-3');
select pg_temp.as_user('a0000000-0000-4000-8000-000000000012');
select public.register_merchant('Book & Bean 神保町', '書店・カフェ', '東京都千代田区神田神保町 1-1');

-- チャージ
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select public.charge_wallet(30000, 'bank', 'seed-charge-alice');
select pg_temp.as_user('a0000000-0000-4000-8000-000000000002');
select public.charge_wallet(10000, 'card', 'seed-charge-bob');
select pg_temp.as_user('a0000000-0000-4000-8000-000000000003');
select public.charge_wallet(5000, 'convenience', 'seed-charge-carol');

-- クーポン（全店共通は管理者が直接作成、店舗クーポンはオーナーが作成）
insert into public.coupons (merchant_id, title, discount_type, value, min_amount, valid_from, valid_until, max_uses) values
  (null, '全店で使える 100円引き', 'fixed', 100, 500, now(), now() + interval '90 days', 1000),
  (null, 'はじめての Any Pay 5% OFF', 'percent', 5, 0, now(), now() + interval '90 days', null),
  ((select id from public.merchants where name = 'Any Coffee 渋谷店'), 'Any Coffee ドリンク 10% OFF', 'percent', 10, 0, now(), now() + interval '60 days', 200),
  ((select id from public.merchants where name = 'Book & Bean 神保町'), '書籍 200円引き', 'fixed', 200, 1000, now(), now() + interval '60 days', 50);

-- alice がクーポン獲得 → 決済 → 送金
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select public.claim_coupon((select id from public.coupons where title = '全店で使える 100円引き'));
select public.claim_coupon((select id from public.coupons where title = 'Any Coffee ドリンク 10% OFF'));
select public.pay_static((select id from public.merchants where name = 'Any Coffee 渋谷店'), 1200, 'seed-pay-alice-coffee');
select public.transfer('bob', 2000, 'ランチ代', 'seed-transfer-alice-bob');
select pg_temp.as_user('a0000000-0000-4000-8000-000000000002');
select public.pay_static((select id from public.merchants where name = 'Book & Bean 神保町'), 1800, 'seed-pay-bob-books');
-- 割り勘（alice 作成、bob / carol が 1,500 ずつ）
select pg_temp.as_user('a0000000-0000-4000-8000-000000000001');
select public.create_split_request(3000, '[{"handle":"bob","amount":1500},{"handle":"carol","amount":1500}]', '9月の飲み会');
select pg_temp.as_user('a0000000-0000-4000-8000-000000000003');
select public.pay_split((select m.id from public.split_members m where m.user_id = 'a0000000-0000-4000-8000-000000000003'), 'seed-split-carol');

select set_config('request.jwt.claim.sub', '', true);
