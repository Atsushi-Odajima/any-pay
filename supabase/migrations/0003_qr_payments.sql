-- =============================================================================
-- 0003_qr_payments.sql — Phase 3: QR決済
--   register_merchant / create_qr_token / pay_with_token /
--   create_payment_request / get_payment_request / cancel_payment_request /
--   pay_request / pay_static / 通知・ポイント・レート制限ヘルパー / Realtime publication
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 内部ヘルパー
-- -----------------------------------------------------------------------------

-- 通知を作る
create function public._notify(
  p_user_id uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb
) returns void
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb));
end $$;

-- 冪等リプレイ：キーをロックし、既存取引があれば返す（他人のキーは拒否）
create function public._replay(p_idempotency_key text, p_created_by uuid) returns public.transactions
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare v_tx public.transactions;
begin
  v_tx := public._begin_idempotent(p_idempotency_key);
  if v_tx.id is not null and v_tx.created_by <> p_created_by then
    raise exception 'IDEMPOTENCY_KEY_CONFLICT';
  end if;
  return v_tx;
end $$;

-- 加盟店オーナーであることを検証して merchants 行を返す
create function public._require_merchant_owner(p_merchant_id uuid, p_uid uuid) returns public.merchants
language plpgsql stable
set search_path = public, extensions, pg_temp
as $$
declare v_m public.merchants;
begin
  select * into v_m from public.merchants where id = p_merchant_id;
  if v_m.id is null then
    raise exception 'MERCHANT_NOT_FOUND';
  end if;
  if v_m.owner_id <> p_uid then
    raise exception 'NOT_MERCHANT_OWNER';
  end if;
  return v_m;
end $$;

-- 決済回数レート制限：20回/分（payer の wallet 単位）
create function public._check_payment_rate(p_payer_wallet_id uuid) returns void
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare v_count int;
begin
  select count(*) into v_count from public.transactions
  where from_wallet_id = p_payer_wallet_id and type = 'payment'
    and created_at > now() - interval '1 minute';
  if v_count >= 20 then
    raise exception 'RATE_LIMITED';
  end if;
end $$;

-- ポイント付与額：決済額の 0.5%（切り捨て）
create function public._points_for(p_amount bigint) returns int
language sql immutable parallel safe
as $$ select floor(p_amount * 5 / 1000.0)::int $$;

-- クーポン適用（検証 + 割引額計算）。返り値: {discount, subsidy, title, coupon_id}
--   subsidy = 全店共通クーポン（merchant_id が null）の割引分。treasury が加盟店に補填する
create function public._apply_coupon(
  p_user_coupon_id uuid, p_user_id uuid, p_merchant_id uuid, p_amount bigint
) returns jsonb
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_uc       public.user_coupons;
  v_c        public.coupons;
  v_discount bigint;
begin
  if p_user_coupon_id is null then
    return jsonb_build_object('discount', 0, 'subsidy', 0);
  end if;
  select * into v_uc from public.user_coupons where id = p_user_coupon_id for update;
  if v_uc.id is null or v_uc.user_id <> p_user_id then
    raise exception 'COUPON_INVALID';
  end if;
  if v_uc.used_at is not null then
    raise exception 'COUPON_USED';
  end if;
  select * into v_c from public.coupons where id = v_uc.coupon_id;
  if v_c.id is null or now() < v_c.valid_from or now() > v_c.valid_until then
    raise exception 'COUPON_INVALID';
  end if;
  if v_c.merchant_id is not null and v_c.merchant_id <> p_merchant_id then
    raise exception 'COUPON_NOT_FOR_MERCHANT';
  end if;
  if p_amount < v_c.min_amount then
    raise exception 'COUPON_MIN_AMOUNT';
  end if;
  v_discount := case v_c.discount_type
    when 'fixed' then v_c.value
    when 'percent' then floor(p_amount * v_c.value / 100.0)::bigint
  end;
  -- 支払額は最低 1 円（transactions.amount > 0）
  v_discount := least(greatest(v_discount, 0), p_amount - 1);
  return jsonb_build_object(
    'discount', v_discount,
    'subsidy', case when v_c.merchant_id is null then v_discount else 0 end,
    'title', v_c.title,
    'coupon_id', v_c.id
  );
end $$;

-- 決済の共通処理：レート制限 → クーポン → 記帳 → クーポン消費 → ポイント → 通知
create function public._settle_payment(
  p_payer_id        uuid,
  p_merchant        public.merchants,
  p_amount          bigint,
  p_idempotency_key text,
  p_method          text,
  p_user_coupon_id  uuid,
  p_created_by      uuid,
  p_memo            text
) returns public.transactions
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_payer_wallet public.wallets;
  v_payer        public.profiles;
  v_coupon       jsonb;
  v_discount     bigint;
  v_final        bigint;
  v_points       int;
  v_tx           public.transactions;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  v_payer_wallet := public._my_user_wallet(p_payer_id);
  select * into v_payer from public.profiles where id = p_payer_id;

  perform public._check_payment_rate(v_payer_wallet.id);

  v_coupon   := public._apply_coupon(p_user_coupon_id, p_payer_id, p_merchant.id, p_amount);
  v_discount := (v_coupon ->> 'discount')::bigint;
  v_final    := p_amount - v_discount;
  v_points   := public._points_for(v_final);

  v_tx := public._post_transaction(
    'payment', v_payer_wallet.id, p_merchant.wallet_id, v_final, p_idempotency_key, p_created_by,
    p_merchant.id, p_memo,
    jsonb_build_object(
      'payment_method', p_method,
      'merchant_name', p_merchant.name,
      'payer_id', p_payer_id,
      'payer_handle', v_payer.handle,
      'payer_name', v_payer.display_name,
      'points', v_points
    ) || case when v_discount > 0 then jsonb_build_object(
      'original_amount', p_amount,
      'discount', v_discount,
      'coupon_title', v_coupon ->> 'title',
      'user_coupon_id', p_user_coupon_id
    ) else '{}'::jsonb end,
    (v_coupon ->> 'subsidy')::bigint
  );

  if p_user_coupon_id is not null then
    update public.user_coupons set used_at = now(), transaction_id = v_tx.id where id = p_user_coupon_id;
  end if;
  if v_points > 0 then
    insert into public.point_entries (user_id, delta, reason, transaction_id)
    values (p_payer_id, v_points, 'payment', v_tx.id);
  end if;

  perform public._notify(p_payer_id, 'payment_sent',
    format('%s に ¥%s を支払いました', p_merchant.name, to_char(v_final, 'FM999,999,999')),
    case when v_points > 0 then format('%s ポイント獲得', v_points) else null end,
    jsonb_build_object('transaction_id', v_tx.id, 'amount', v_final, 'merchant_id', p_merchant.id));
  perform public._notify(p_merchant.owner_id, 'payment_received',
    format('¥%s の決済を受け付けました', to_char(v_final, 'FM999,999,999')),
    format('%s（@%s）', v_payer.display_name, v_payer.handle),
    jsonb_build_object('transaction_id', v_tx.id, 'amount', v_final, 'merchant_id', p_merchant.id));

  return v_tx;
end $$;

-- -----------------------------------------------------------------------------
-- register_merchant: 店舗登録（merchant wallet 作成 + role 更新）。1オーナー1店舗
-- -----------------------------------------------------------------------------
create function public.register_merchant(
  p_name text, p_category text default null, p_address text default null
) returns public.merchants
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid    uuid := public._uid();
  v_wallet uuid;
  v_m      public.merchants;
begin
  perform public._my_user_wallet(v_uid); -- profile の存在確認
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'INVALID_NAME';
  end if;
  if exists (select 1 from public.merchants where owner_id = v_uid) then
    raise exception 'MERCHANT_ALREADY_REGISTERED';
  end if;
  insert into public.wallets (owner_id, kind) values (v_uid, 'merchant') returning id into v_wallet;
  insert into public.merchants (owner_id, wallet_id, name, category, address)
  values (v_uid, v_wallet, trim(p_name), nullif(trim(p_category), ''), nullif(trim(p_address), ''))
  returning * into v_m;
  update public.profiles set role = 'merchant' where id = v_uid and role = 'user';
  return v_m;
end $$;

-- -----------------------------------------------------------------------------
-- create_qr_token: 未使用トークンを失効させ、60秒有効のトークンを発行
-- -----------------------------------------------------------------------------
create function public.create_qr_token() returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid     uuid := public._uid();
  v_token   text;
  v_expires timestamptz;
begin
  perform public._my_user_wallet(v_uid);
  update public.qr_tokens set expires_at = now()
  where user_id = v_uid and used_at is null and expires_at > now();

  v_token := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
  v_expires := now() + interval '60 seconds';
  insert into public.qr_tokens (user_id, token, expires_at) values (v_uid, v_token, v_expires);
  return jsonb_build_object('token', v_token, 'expires_at', v_expires);
end $$;

-- -----------------------------------------------------------------------------
-- pay_with_token: 加盟店がユーザー提示QRを読み取って決済
-- -----------------------------------------------------------------------------
create function public.pay_with_token(
  p_token text, p_amount bigint, p_merchant_id uuid, p_idempotency_key text
) returns public.transactions
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_m   public.merchants;
  v_tok public.qr_tokens;
  v_tx  public.transactions;
begin
  v_tx := public._replay(p_idempotency_key, v_uid);
  if v_tx.id is not null then
    return v_tx;
  end if;
  v_m := public._require_merchant_owner(p_merchant_id, v_uid);
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into v_tok from public.qr_tokens where token = p_token for update;
  if v_tok.id is null then
    raise exception 'TOKEN_INVALID';
  end if;
  if v_tok.used_at is not null then
    raise exception 'TOKEN_USED';
  end if;
  if v_tok.expires_at <= now() then
    raise exception 'TOKEN_EXPIRED';
  end if;

  v_tx := public._settle_payment(v_tok.user_id, v_m, p_amount, p_idempotency_key,
                                 'user_presented', null, v_uid, null);
  update public.qr_tokens set used_at = now() where id = v_tok.id;
  return v_tx;
end $$;

-- -----------------------------------------------------------------------------
-- 動的QR（店舗提示・金額固定）
-- -----------------------------------------------------------------------------
create function public.create_payment_request(
  p_amount bigint, p_memo text default null, p_merchant_id uuid default null
) returns public.payment_requests
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_m   public.merchants;
  v_r   public.payment_requests;
begin
  if p_merchant_id is null then
    select * into v_m from public.merchants where owner_id = v_uid order by created_at limit 1;
    if v_m.id is null then
      raise exception 'MERCHANT_NOT_FOUND';
    end if;
  else
    v_m := public._require_merchant_owner(p_merchant_id, v_uid);
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  insert into public.payment_requests (merchant_id, amount, memo, expires_at)
  values (v_m.id, p_amount, nullif(trim(p_memo), ''), now() + interval '5 minutes')
  returning * into v_r;
  return v_r;
end $$;

-- 支払う側がリクエスト内容を確認する（id は推測不能な uuid。認証済みなら誰でも可）
create function public.get_payment_request(p_request_id uuid) returns jsonb
language plpgsql security definer stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_r   public.payment_requests;
  v_m   public.merchants;
begin
  select * into v_r from public.payment_requests where id = p_request_id;
  if v_r.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;
  select * into v_m from public.merchants where id = v_r.merchant_id;
  return jsonb_build_object(
    'id', v_r.id,
    'merchant_id', v_m.id,
    'merchant_name', v_m.name,
    'merchant_category', v_m.category,
    'amount', v_r.amount,
    'memo', v_r.memo,
    'status', case when v_r.status = 'open' and v_r.expires_at <= now() then 'expired' else v_r.status end,
    'expires_at', v_r.expires_at,
    'paid_transaction_id', v_r.paid_transaction_id
  );
end $$;

create function public.cancel_payment_request(p_request_id uuid) returns public.payment_requests
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_r   public.payment_requests;
begin
  select * into v_r from public.payment_requests where id = p_request_id for update;
  if v_r.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;
  perform public._require_merchant_owner(v_r.merchant_id, v_uid);
  if v_r.status <> 'open' then
    raise exception 'REQUEST_NOT_OPEN';
  end if;
  update public.payment_requests set status = 'cancelled' where id = v_r.id returning * into v_r;
  return v_r;
end $$;

create function public.pay_request(
  p_request_id uuid, p_idempotency_key text, p_user_coupon_id uuid default null
) returns public.transactions
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_r   public.payment_requests;
  v_m   public.merchants;
  v_tx  public.transactions;
begin
  v_tx := public._replay(p_idempotency_key, v_uid);
  if v_tx.id is not null then
    return v_tx;
  end if;
  select * into v_r from public.payment_requests where id = p_request_id for update;
  if v_r.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;
  if v_r.status <> 'open' then
    raise exception 'REQUEST_NOT_OPEN';
  end if;
  if v_r.expires_at <= now() then
    raise exception 'REQUEST_EXPIRED';
  end if;
  select * into v_m from public.merchants where id = v_r.merchant_id;

  v_tx := public._settle_payment(v_uid, v_m, v_r.amount, p_idempotency_key,
                                 'merchant_dynamic', p_user_coupon_id, v_uid, v_r.memo);
  update public.payment_requests set status = 'paid', paid_transaction_id = v_tx.id where id = v_r.id;
  return v_tx;
end $$;

-- -----------------------------------------------------------------------------
-- 静的QR（店舗提示・金額はユーザー入力）
-- -----------------------------------------------------------------------------
create function public.pay_static(
  p_merchant_id uuid, p_amount bigint, p_idempotency_key text, p_user_coupon_id uuid default null
) returns public.transactions
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_m   public.merchants;
  v_tx  public.transactions;
begin
  v_tx := public._replay(p_idempotency_key, v_uid);
  if v_tx.id is not null then
    return v_tx;
  end if;
  select * into v_m from public.merchants where id = p_merchant_id;
  if v_m.id is null then
    raise exception 'MERCHANT_NOT_FOUND';
  end if;
  return public._settle_payment(v_uid, v_m, p_amount, p_idempotency_key,
                                'merchant_static', p_user_coupon_id, v_uid, null);
end $$;

-- -----------------------------------------------------------------------------
-- Realtime：本人行のみ購読（RLS 適用）。publication が存在する環境（Supabase）でのみ追加
-- -----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.transactions, public.notifications, public.payment_requests;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 権限
-- -----------------------------------------------------------------------------
revoke execute on function public._notify(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public._replay(text, uuid) from public, anon, authenticated;
revoke execute on function public._require_merchant_owner(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._check_payment_rate(uuid) from public, anon, authenticated;
revoke execute on function public._points_for(bigint) from public, anon, authenticated;
revoke execute on function public._apply_coupon(uuid, uuid, uuid, bigint) from public, anon, authenticated;
revoke execute on function public._settle_payment(uuid, public.merchants, bigint, text, text, uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.register_merchant(text, text, text) to authenticated;
grant execute on function public.create_qr_token() to authenticated;
grant execute on function public.pay_with_token(text, bigint, uuid, text) to authenticated;
grant execute on function public.create_payment_request(bigint, text, uuid) to authenticated;
grant execute on function public.get_payment_request(uuid) to authenticated;
grant execute on function public.cancel_payment_request(uuid) to authenticated;
grant execute on function public.pay_request(uuid, text, uuid) to authenticated;
grant execute on function public.pay_static(uuid, bigint, text, uuid) to authenticated;
