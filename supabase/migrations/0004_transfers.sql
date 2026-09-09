-- =============================================================================
-- 0004_transfers.sql — Phase 4: 個人間送金・割り勘
--   transfer / create_split_request / pay_split
-- =============================================================================

-- -----------------------------------------------------------------------------
-- transfer: 個人間送金。1回上限 50,000円。自分宛て不可
-- -----------------------------------------------------------------------------
create function public.transfer(
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

-- -----------------------------------------------------------------------------
-- create_split_request: 割り勘作成。p_members = [{handle, amount}]、合計 = total
-- -----------------------------------------------------------------------------
create function public.create_split_request(
  p_total bigint, p_members jsonb, p_memo text default null
) returns public.split_requests
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid     uuid := public._uid();
  v_creator public.profiles;
  v_req     public.split_requests;
  v_item    jsonb;
  v_handle  text;
  v_amount  bigint;
  v_member  public.profiles;
  v_sum     bigint := 0;
  v_count   int := 0;
  v_seen    text[] := '{}';
  v_memo    text := nullif(trim(coalesce(p_memo, '')), '');
  v_member_id uuid;
begin
  select * into v_creator from public.profiles where id = v_uid;
  if v_creator.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if p_total is null or p_total < 1 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_members is null or jsonb_typeof(p_members) <> 'array' or jsonb_array_length(p_members) = 0 then
    raise exception 'SPLIT_MEMBERS_REQUIRED';
  end if;
  if jsonb_array_length(p_members) > 20 then
    raise exception 'SPLIT_TOO_MANY_MEMBERS';
  end if;

  -- 事前検証（合計・重複・存在・作成者除外）
  for v_item in select * from jsonb_array_elements(p_members) loop
    v_handle := lower(trim(v_item ->> 'handle'));
    v_amount := (v_item ->> 'amount')::bigint;
    if v_handle is null or v_amount is null or v_amount < 1 then
      raise exception 'SPLIT_MEMBER_INVALID';
    end if;
    if v_amount > 50000 then
      raise exception 'LIMIT_EXCEEDED';
    end if;
    if v_handle = any(v_seen) then
      raise exception 'SPLIT_MEMBER_DUPLICATE';
    end if;
    v_seen := v_seen || v_handle;
    if v_handle = v_creator.handle then
      raise exception 'SPLIT_CREATOR_INCLUDED';
    end if;
    if not exists (select 1 from public.profiles where handle = v_handle) then
      raise exception 'SPLIT_MEMBER_NOT_FOUND';
    end if;
    v_sum := v_sum + v_amount;
    v_count := v_count + 1;
  end loop;
  if v_sum <> p_total then
    raise exception 'SPLIT_TOTAL_MISMATCH';
  end if;

  insert into public.split_requests (creator_id, total_amount, memo)
  values (v_uid, p_total, v_memo) returning * into v_req;

  for v_item in select * from jsonb_array_elements(p_members) loop
    v_handle := lower(trim(v_item ->> 'handle'));
    v_amount := (v_item ->> 'amount')::bigint;
    select * into v_member from public.profiles where handle = v_handle;
    insert into public.split_members (split_request_id, user_id, amount)
    values (v_req.id, v_member.id, v_amount) returning id into v_member_id;
    perform public._notify(v_member.id, 'split_requested',
      format('%s から割り勘のリクエスト ¥%s', v_creator.display_name, to_char(v_amount, 'FM999,999,999')),
      v_memo,
      jsonb_build_object('split_request_id', v_req.id, 'split_member_id', v_member_id, 'amount', v_amount));
  end loop;
  return v_req;
end $$;

-- -----------------------------------------------------------------------------
-- pay_split: メンバーが自分の分を作成者へ送金し、支払済みにする
-- -----------------------------------------------------------------------------
create function public.pay_split(p_split_member_id uuid, p_idempotency_key text)
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

grant execute on function public.transfer(text, bigint, text, text) to authenticated;
grant execute on function public.create_split_request(bigint, jsonb, text) to authenticated;
grant execute on function public.pay_split(uuid, text) to authenticated;
