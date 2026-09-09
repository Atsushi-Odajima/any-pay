-- =============================================================================
-- 0002_ledger.sql — Phase 2: 台帳の中核
--   treasury wallet / ledger 合計0の遅延制約 / 追記専用ガード /
--   _begin_idempotent / _post_transaction / charge_wallet / withdraw
-- =============================================================================

-- -----------------------------------------------------------------------------
-- treasury（チャージ元・出金先の system wallet）。RPC が依存するため seed ではなく migration で作る
-- -----------------------------------------------------------------------------
insert into public.wallets (id, owner_id, kind)
values ('00000000-0000-0000-0000-000000000001', null, 'system');

create function public._treasury_id() returns uuid
language sql immutable parallel safe
as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$;

-- -----------------------------------------------------------------------------
-- ledger_entries: transaction ごとの sum(amount) = 0 を遅延制約トリガーで担保
-- -----------------------------------------------------------------------------
create function public.check_ledger_balanced() returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare v_sum bigint;
begin
  select coalesce(sum(amount), 0) into v_sum
  from public.ledger_entries where transaction_id = new.transaction_id;
  if v_sum <> 0 then
    raise exception 'LEDGER_UNBALANCED'
      using detail = format('transaction %s: sum(amount) = %s', new.transaction_id, v_sum);
  end if;
  return null;
end $$;

create constraint trigger ledger_entries_balanced
  after insert on public.ledger_entries
  deferrable initially deferred
  for each row execute function public.check_ledger_balanced();

-- ledger_entries は追記専用（security definer 関数や管理者であっても UPDATE / DELETE を拒否）
create function public.reject_mutation() returns trigger
language plpgsql
as $$
begin
  raise exception 'LEDGER_IMMUTABLE' using detail = format('%s on %s is not allowed', tg_op, tg_table_name);
end $$;

create trigger ledger_entries_immutable
  before update or delete on public.ledger_entries
  for each row execute function public.reject_mutation();

-- -----------------------------------------------------------------------------
-- 冪等性：キーで advisory lock を取り、既存 transaction があれば返す
--   同じキーの同時呼び出しは lock で直列化され、2回目は既存行を見る
-- -----------------------------------------------------------------------------
create function public._begin_idempotent(p_idempotency_key text) returns public.transactions
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare v_tx public.transactions;
begin
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_idempotency_key));
  select * into v_tx from public.transactions where idempotency_key = p_idempotency_key;
  return v_tx;
end $$;

-- -----------------------------------------------------------------------------
-- _post_transaction: すべての金銭移動の唯一の書き込み口
--   ロック（id 昇順 FOR UPDATE）→ 残高確認 → transactions + ledger_entries → balance_cache 更新
--   p_subsidy > 0 : treasury → p_to に追加で移す（全店共通クーポンの割引分をプラットフォームが補填）
--   p_subsidy < 0 : p_from → treasury に |p_subsidy| を戻す（補填の取り消し＝返金）
--   p_max_to_balance: p_to の残高上限（チャージ上限に使用）
-- -----------------------------------------------------------------------------
create function public._post_transaction(
  p_type            public.tx_type,
  p_from_wallet_id  uuid,
  p_to_wallet_id    uuid,
  p_amount          bigint,
  p_idempotency_key text,
  p_created_by      uuid,
  p_merchant_id     uuid default null,
  p_memo            text default null,
  p_metadata        jsonb default '{}'::jsonb,
  p_subsidy         bigint default 0,
  p_max_to_balance  bigint default null
) returns public.transactions
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_existing   public.transactions;
  v_tx         public.transactions;
  v_treasury   uuid := public._treasury_id();
  v_from       public.wallets;
  v_to         public.wallets;
  v_tre        public.wallets;
  v_w          public.wallets;
  v_from_delta bigint;
  v_to_delta   bigint;
  v_tre_delta  bigint := 0;
  v_ids        uuid[];
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_from_wallet_id is null or p_to_wallet_id is null or p_from_wallet_id = p_to_wallet_id then
    raise exception 'INVALID_WALLET_PAIR';
  end if;
  if p_subsidy <> 0 and (p_from_wallet_id = v_treasury or p_to_wallet_id = v_treasury) then
    raise exception 'INVALID_SUBSIDY';
  end if;

  -- 冪等：既存があればそれを返す（金額・種別が違うキー再利用は拒否）
  v_existing := public._begin_idempotent(p_idempotency_key);
  if v_existing.id is not null then
    if v_existing.created_by <> p_created_by or v_existing.amount <> p_amount or v_existing.type <> p_type then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT';
    end if;
    return v_existing;
  end if;

  -- 関与する wallet を id 昇順でロック（デッドロック防止）
  v_ids := array[p_from_wallet_id, p_to_wallet_id];
  if p_subsidy <> 0 then
    v_ids := v_ids || v_treasury;
  end if;
  for v_w in select * from public.wallets where id = any(v_ids) order by id for update loop
    if v_w.id = p_from_wallet_id then v_from := v_w; end if;
    if v_w.id = p_to_wallet_id   then v_to   := v_w; end if;
    if v_w.id = v_treasury       then v_tre  := v_w; end if;
  end loop;
  if v_from.id is null or v_to.id is null or (p_subsidy <> 0 and v_tre.id is null) then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  -- 各 wallet の増減
  v_from_delta := -p_amount;
  v_to_delta   := p_amount;
  if p_subsidy > 0 then
    v_to_delta  := v_to_delta + p_subsidy;
    v_tre_delta := -p_subsidy;
  elsif p_subsidy < 0 then
    v_from_delta := v_from_delta + p_subsidy;   -- さらに減る
    v_tre_delta  := -p_subsidy;                 -- 戻る
  end if;

  -- 残高確認（system wallet はマイナス可）
  if v_from.kind <> 'system' and v_from.balance_cache + v_from_delta < 0 then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;
  if p_max_to_balance is not null and v_to.balance_cache + v_to_delta > p_max_to_balance then
    raise exception 'LIMIT_EXCEEDED';
  end if;

  insert into public.transactions (
    type, status, amount, from_wallet_id, to_wallet_id, merchant_id, memo,
    idempotency_key, created_by, metadata, completed_at
  ) values (
    p_type, 'completed', p_amount, p_from_wallet_id, p_to_wallet_id, p_merchant_id, p_memo,
    p_idempotency_key, p_created_by,
    coalesce(p_metadata, '{}'::jsonb) || case when p_subsidy <> 0 then jsonb_build_object('subsidy', p_subsidy) else '{}'::jsonb end,
    now()
  ) returning * into v_tx;

  insert into public.ledger_entries (transaction_id, wallet_id, amount, balance_after) values
    (v_tx.id, v_from.id, v_from_delta, v_from.balance_cache + v_from_delta),
    (v_tx.id, v_to.id,   v_to_delta,   v_to.balance_cache   + v_to_delta);
  if v_tre_delta <> 0 then
    insert into public.ledger_entries (transaction_id, wallet_id, amount, balance_after)
    values (v_tx.id, v_tre.id, v_tre_delta, v_tre.balance_cache + v_tre_delta);
  end if;

  update public.wallets set balance_cache = balance_cache + v_from_delta, updated_at = now() where id = v_from.id;
  update public.wallets set balance_cache = balance_cache + v_to_delta,   updated_at = now() where id = v_to.id;
  if v_tre_delta <> 0 then
    update public.wallets set balance_cache = balance_cache + v_tre_delta, updated_at = now() where id = v_tre.id;
  end if;

  return v_tx;
end $$;

-- 自分の user wallet
create function public._my_user_wallet(p_uid uuid) returns public.wallets
language plpgsql stable
set search_path = public, extensions, pg_temp
as $$
declare v_w public.wallets;
begin
  select * into v_w from public.wallets where owner_id = p_uid and kind = 'user';
  if v_w.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  return v_w;
end $$;

-- -----------------------------------------------------------------------------
-- charge_wallet: treasury → user。1回 1〜100,000円、残高上限 1,000,000円
-- -----------------------------------------------------------------------------
create function public.charge_wallet(
  p_amount          bigint,
  p_method          text,
  p_idempotency_key text
) returns public.transactions
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid    uuid := public._uid();
  v_wallet public.wallets;
begin
  if p_amount is null or p_amount < 1 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_amount > 100000 then
    raise exception 'LIMIT_EXCEEDED';
  end if;
  if p_method not in ('bank', 'card', 'convenience') then
    raise exception 'INVALID_METHOD';
  end if;
  v_wallet := public._my_user_wallet(v_uid);
  return public._post_transaction(
    'charge', public._treasury_id(), v_wallet.id, p_amount, p_idempotency_key, v_uid,
    null, null, jsonb_build_object('method', p_method), 0, 1000000
  );
end $$;

-- -----------------------------------------------------------------------------
-- withdraw: wallet → treasury。手数料0（デモ）。p_wallet_id 省略時は user wallet、
-- 指定時は自分がオーナーの wallet（加盟店 wallet を含む）
-- -----------------------------------------------------------------------------
create function public.withdraw(
  p_amount          bigint,
  p_idempotency_key text,
  p_wallet_id       uuid default null
) returns public.transactions
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid    uuid := public._uid();
  v_wallet public.wallets;
begin
  if p_amount is null or p_amount < 1 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_wallet_id is null then
    v_wallet := public._my_user_wallet(v_uid);
  else
    select * into v_wallet from public.wallets where id = p_wallet_id and owner_id = v_uid;
    if v_wallet.id is null then
      raise exception 'WALLET_NOT_FOUND';
    end if;
  end if;
  return public._post_transaction(
    'withdrawal', v_wallet.id, public._treasury_id(), p_amount, p_idempotency_key, v_uid,
    null, null, jsonb_build_object('wallet_kind', v_wallet.kind)
  );
end $$;

-- -----------------------------------------------------------------------------
-- 権限
-- -----------------------------------------------------------------------------
revoke execute on function public._treasury_id() from public, anon, authenticated;
revoke execute on function public.check_ledger_balanced() from public, anon, authenticated;
revoke execute on function public.reject_mutation() from public, anon, authenticated;
revoke execute on function public._begin_idempotent(text) from public, anon, authenticated;
revoke execute on function public._post_transaction(public.tx_type, uuid, uuid, bigint, text, uuid, uuid, text, jsonb, bigint, bigint)
  from public, anon, authenticated;
revoke execute on function public._my_user_wallet(uuid) from public, anon, authenticated;

grant execute on function public.charge_wallet(bigint, text, text) to authenticated;
grant execute on function public.withdraw(bigint, text, uuid) to authenticated;
