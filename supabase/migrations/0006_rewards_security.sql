-- =============================================================================
-- 0006_rewards_security.sql — Phase 6: クーポン獲得 / PIN / 決済前PINゲート
--   claim_coupon / set_pin / verify_pin / pin_status / _require_pin_verified
--   決済・送金 RPC を create or replace して PIN ゲートを組み込む
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pin_attempts: 連続失敗回数・ロック・最終照合時刻（本人のみ SELECT、書き込みは RPC）
-- -----------------------------------------------------------------------------
create table public.pin_attempts (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  failed_count int not null default 0,
  locked_until timestamptz,
  verified_at  timestamptz,
  updated_at   timestamptz not null default now()
);
alter table public.pin_attempts enable row level security;
create policy pin_attempts_select_own on public.pin_attempts
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.pin_attempts from anon, authenticated;
grant select on public.pin_attempts to authenticated;

-- -----------------------------------------------------------------------------
-- claim_coupon: クーポン獲得（max_uses を行ロックで直列に検査）
-- -----------------------------------------------------------------------------
create function public.claim_coupon(p_coupon_id uuid) returns public.user_coupons
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_c   public.coupons;
  v_uc  public.user_coupons;
  v_n   int;
begin
  perform public._my_user_wallet(v_uid);
  select * into v_c from public.coupons where id = p_coupon_id for update;
  if v_c.id is null or now() < v_c.valid_from or now() > v_c.valid_until then
    raise exception 'COUPON_INVALID';
  end if;
  if exists (select 1 from public.user_coupons where coupon_id = p_coupon_id and user_id = v_uid) then
    raise exception 'COUPON_ALREADY_CLAIMED';
  end if;
  if v_c.max_uses is not null then
    select count(*) into v_n from public.user_coupons where coupon_id = p_coupon_id;
    if v_n >= v_c.max_uses then
      raise exception 'COUPON_EXHAUSTED';
    end if;
  end if;
  insert into public.user_coupons (coupon_id, user_id) values (p_coupon_id, v_uid) returning * into v_uc;
  return v_uc;
end $$;

-- -----------------------------------------------------------------------------
-- PIN
-- -----------------------------------------------------------------------------
create function public.set_pin(p_pin text, p_current_pin text default null) returns boolean
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_p   public.profiles;
begin
  select * into v_p from public.profiles where id = v_uid for update;
  if v_p.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN_FORMAT';
  end if;
  -- 変更時は現在の PIN を要求
  if v_p.pin_hash is not null then
    if p_current_pin is null or extensions.crypt(p_current_pin, v_p.pin_hash) <> v_p.pin_hash then
      raise exception 'PIN_INVALID';
    end if;
  end if;
  update public.profiles set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)) where id = v_uid;
  insert into public.pin_attempts (user_id, failed_count, locked_until, verified_at)
  values (v_uid, 0, null, now())
  on conflict (user_id) do update set failed_count = 0, locked_until = null, verified_at = now(), updated_at = now();
  return true;
end $$;

-- 5回失敗で10分ロック。成功で verified_at を更新（5分間は決済 RPC の PIN ゲートを通過できる）
--   失敗は例外ではなく {ok:false, remaining, locked_until} を返す
--   （raise exception では失敗回数の UPDATE ごと巻き戻ってしまい、ロックが機能しないため）
create function public.verify_pin(p_pin text) returns jsonb
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid   uuid := public._uid();
  v_p     public.profiles;
  v_a     public.pin_attempts;
  v_fails int;
begin
  select * into v_p from public.profiles where id = v_uid;
  if v_p.pin_hash is null then
    raise exception 'PIN_NOT_SET';
  end if;
  insert into public.pin_attempts (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_a from public.pin_attempts where user_id = v_uid for update;
  if v_a.locked_until is not null and v_a.locked_until > now() then
    raise exception 'PIN_LOCKED';
  end if;
  if extensions.crypt(coalesce(p_pin, ''), v_p.pin_hash) = v_p.pin_hash then
    update public.pin_attempts
    set failed_count = 0, locked_until = null, verified_at = now(), updated_at = now()
    where user_id = v_uid;
    return jsonb_build_object('ok', true, 'remaining', 5, 'locked_until', null);
  end if;
  v_fails := v_a.failed_count + 1;
  if v_fails >= 5 then
    update public.pin_attempts
    set failed_count = 0, locked_until = now() + interval '10 minutes', updated_at = now()
    where user_id = v_uid;
    return jsonb_build_object('ok', false, 'remaining', 0, 'locked_until', now() + interval '10 minutes');
  end if;
  update public.pin_attempts set failed_count = v_fails, updated_at = now() where user_id = v_uid;
  return jsonb_build_object('ok', false, 'remaining', 5 - v_fails, 'locked_until', null);
end $$;

create function public.pin_status() returns jsonb
language plpgsql security definer stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_p   public.profiles;
  v_a   public.pin_attempts;
begin
  select * into v_p from public.profiles where id = v_uid;
  select * into v_a from public.pin_attempts where user_id = v_uid;
  return jsonb_build_object(
    'has_pin', v_p.pin_hash is not null,
    'locked_until', case when v_a.locked_until > now() then v_a.locked_until else null end,
    'failed_count', coalesce(v_a.failed_count, 0),
    'verified_at', v_a.verified_at,
    'verified', v_a.verified_at is not null and v_a.verified_at > now() - interval '5 minutes'
  );
end $$;

-- 決済前 PIN ゲート（サーバー側）：PIN 設定済みなら直近5分以内の verify_pin 成功を要求
create function public._require_pin_verified(p_uid uuid) returns void
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare v_has_pin boolean; v_verified_at timestamptz;
begin
  select pin_hash is not null into v_has_pin from public.profiles where id = p_uid;
  if not coalesce(v_has_pin, false) then
    return;
  end if;
  select verified_at into v_verified_at from public.pin_attempts where user_id = p_uid;
  if v_verified_at is null or v_verified_at < now() - interval '5 minutes' then
    raise exception 'PIN_REQUIRED';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 決済・送金 RPC に PIN ゲートを組み込む（本人が起点となる操作のみ。加盟店が読む pay_with_token は対象外）
-- -----------------------------------------------------------------------------
create or replace function public.pay_request(
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
  perform public._require_pin_verified(v_uid);
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

create or replace function public.pay_static(
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
  perform public._require_pin_verified(v_uid);
  select * into v_m from public.merchants where id = p_merchant_id;
  if v_m.id is null then
    raise exception 'MERCHANT_NOT_FOUND';
  end if;
  return public._settle_payment(v_uid, v_m, p_amount, p_idempotency_key,
                                'merchant_static', p_user_coupon_id, v_uid, null);
end $$;

create or replace function public.transfer(
  p_to_handle text, p_amount bigint, p_memo text, p_idempotency_key text
) returns public.transactions
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid  uuid := public._uid();
  v_from public.profiles;
  v_to   public.profiles;
  v_fw   public.wallets;
  v_tw   public.wallets;
  v_tx   public.transactions;
  v_memo text := nullif(trim(coalesce(p_memo, '')), '');
begin
  v_tx := public._replay(p_idempotency_key, v_uid);
  if v_tx.id is not null then
    return v_tx;
  end if;
  perform public._require_pin_verified(v_uid);
  if p_amount is null or p_amount < 1 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_amount > 50000 then
    raise exception 'LIMIT_EXCEEDED';
  end if;
  if v_memo is not null and char_length(v_memo) > 100 then
    raise exception 'MEMO_TOO_LONG';
  end if;
  select * into v_from from public.profiles where id = v_uid;
  select * into v_to from public.profiles where handle = lower(trim(p_to_handle));
  if v_to.id is null then
    raise exception 'USER_NOT_FOUND';
  end if;
  if v_to.id = v_uid then
    raise exception 'SELF_TRANSFER';
  end if;
  v_fw := public._my_user_wallet(v_uid);
  v_tw := public._my_user_wallet(v_to.id);

  v_tx := public._post_transaction(
    'transfer', v_fw.id, v_tw.id, p_amount, p_idempotency_key, v_uid, null, v_memo,
    jsonb_build_object(
      'from_id', v_from.id, 'from_handle', v_from.handle, 'from_name', v_from.display_name,
      'to_id', v_to.id, 'to_handle', v_to.handle, 'to_name', v_to.display_name
    )
  );
  perform public._notify(v_to.id, 'transfer_received',
    format('%s から ¥%s を受け取りました', v_from.display_name, to_char(p_amount, 'FM999,999,999')),
    v_memo,
    jsonb_build_object('transaction_id', v_tx.id, 'amount', p_amount, 'from_handle', v_from.handle));
  return v_tx;
end $$;

create or replace function public.pay_split(p_split_member_id uuid, p_idempotency_key text)
returns public.transactions
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid     uuid := public._uid();
  v_m       public.split_members;
  v_req     public.split_requests;
  v_payer   public.profiles;
  v_creator public.profiles;
  v_fw      public.wallets;
  v_tw      public.wallets;
  v_tx      public.transactions;
  v_remaining int;
begin
  v_tx := public._replay(p_idempotency_key, v_uid);
  if v_tx.id is not null then
    return v_tx;
  end if;
  perform public._require_pin_verified(v_uid);
  select * into v_m from public.split_members where id = p_split_member_id for update;
  if v_m.id is null or v_m.user_id <> v_uid then
    raise exception 'SPLIT_MEMBER_NOT_FOUND';
  end if;
  if v_m.paid_transaction_id is not null then
    raise exception 'ALREADY_PAID';
  end if;
  select * into v_req from public.split_requests where id = v_m.split_request_id;
  select * into v_payer from public.profiles where id = v_uid;
  select * into v_creator from public.profiles where id = v_req.creator_id;
  v_fw := public._my_user_wallet(v_uid);
  v_tw := public._my_user_wallet(v_req.creator_id);

  v_tx := public._post_transaction(
    'split', v_fw.id, v_tw.id, v_m.amount, p_idempotency_key, v_uid, null, v_req.memo,
    jsonb_build_object(
      'split_request_id', v_req.id, 'split_member_id', v_m.id,
      'from_id', v_payer.id, 'from_handle', v_payer.handle, 'from_name', v_payer.display_name,
      'to_id', v_creator.id, 'to_handle', v_creator.handle, 'to_name', v_creator.display_name
    )
  );
  update public.split_members set paid_transaction_id = v_tx.id where id = v_m.id;

  select count(*) into v_remaining from public.split_members
  where split_request_id = v_req.id and paid_transaction_id is null;
  perform public._notify(v_req.creator_id, 'split_paid',
    format('%s が割り勘 ¥%s を支払いました', v_payer.display_name, to_char(v_m.amount, 'FM999,999,999')),
    case when v_remaining = 0 then '全員の支払いが完了しました' else format('残り %s 人', v_remaining) end,
    jsonb_build_object('split_request_id', v_req.id, 'transaction_id', v_tx.id, 'amount', v_m.amount));
  return v_tx;
end $$;

-- -----------------------------------------------------------------------------
-- 権限
-- -----------------------------------------------------------------------------
revoke execute on function public._require_pin_verified(uuid) from public, anon, authenticated;
grant execute on function public.claim_coupon(uuid) to authenticated;
grant execute on function public.set_pin(text, text) to authenticated;
grant execute on function public.verify_pin(text) to authenticated;
grant execute on function public.pin_status() to authenticated;
