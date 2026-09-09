-- =============================================================================
-- 0011_charge_gateway.sql — チャージ API（Charge Gateway）
--   銀行連携 / クレジット決済 / その他電子決済 などの外部入金手段を、Edge Function の
--   プロバイダ層（supabase/functions/_shared/gateway）で扱うための土台。
--
--   流れ：
--     1. ユーザーが create_charge_request（RPC）で「入金リクエスト」を作る（status = pending）
--     2. Edge Function charge-create がプロバイダ API を呼び、provider_ref / リダイレクト先 /
--        払込番号などを attach_charge_provider（service_role）で紐づける
--     3. プロバイダの確定通知（webhook）を charge-webhook が検証し、
--        complete_charge_request（service_role）が台帳に記帳する（treasury → user wallet）
--   原則：
--     - 残高が動くのは complete_charge_request → _post_transaction のみ。冪等キー = 'charge_request:' || id
--       （webhook が再送されても二重計上されない）
--     - 状態遷移と記帳は service_role（Edge Function）のみ。クライアントは自分の行の SELECT と
--       pending のキャンセルだけができる
--     - 外部システムを模擬するサンドボックス（sandbox-gateway）の状態は sandbox_payments に置く。
--       service_role 以外はアクセス不可で、「外部プロバイダ側の DB」に相当する
-- =============================================================================

-- -----------------------------------------------------------------------------
-- charge_requests: 入金リクエスト
-- -----------------------------------------------------------------------------
create table public.charge_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  channel         text not null check (channel in ('bank', 'card', 'emoney')),
  provider        text not null check (provider ~ '^[a-z0-9_]{2,32}$'),
  method          text not null check (method ~ '^[a-z0-9_]{2,32}$'),
  amount          bigint not null check (amount > 0),
  status          text not null default 'pending'
                  check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired')),
  provider_ref    text,                        -- プロバイダ側の ID（Checkout Session id / sandbox payment id）
  redirect_url    text,                        -- プロバイダの承認画面（redirect 型）
  instructions    jsonb,                       -- 払込番号など（instructions 型）
  failure_code    text,
  transaction_id  uuid references public.transactions(id),
  idempotency_key text not null,               -- クライアント発行。同じキーは同じリクエストを返す
  metadata        jsonb not null default '{}'::jsonb,
  expires_at      timestamptz not null default now() + interval '30 minutes',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz,
  unique (user_id, idempotency_key)
);
create unique index charge_requests_provider_ref_key
  on public.charge_requests (provider, provider_ref) where provider_ref is not null;
create index charge_requests_user_created_idx on public.charge_requests (user_id, created_at desc);

create function public._charge_requests_touch() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger charge_requests_touch
  before update on public.charge_requests
  for each row execute function public._charge_requests_touch();

alter table public.charge_requests enable row level security;
create policy charge_requests_select_own on public.charge_requests
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.charge_requests from anon, authenticated;
grant select on public.charge_requests to authenticated;

-- Realtime：本人の行の UPDATE を購読して処理状況画面を即時更新する
alter table public.charge_requests replica identity full;
alter publication supabase_realtime add table public.charge_requests;

-- -----------------------------------------------------------------------------
-- sandbox_payments: 模擬プロバイダ（sandbox-gateway）の状態。service_role のみ
-- -----------------------------------------------------------------------------
create table public.sandbox_payments (
  id           text primary key,
  channel      text not null,
  method       text not null,
  amount       bigint not null check (amount > 0),
  currency     text not null default 'jpy',
  status       text not null default 'created'
               check (status in ('created', 'paid', 'declined', 'cancelled', 'expired')),
  reference    text,                           -- 呼び出し側の参照（charge_requests.id）
  return_url   text not null,
  webhook_url  text not null,
  instructions jsonb,
  webhook_log  jsonb not null default '[]'::jsonb,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  paid_at      timestamptz
);
alter table public.sandbox_payments enable row level security;   -- ポリシーなし = service_role 以外は不可
revoke all on public.sandbox_payments from anon, authenticated;

-- -----------------------------------------------------------------------------
-- create_charge_request: ユーザーが入金リクエストを作る
-- -----------------------------------------------------------------------------
create function public.create_charge_request(
  p_amount          bigint,
  p_channel         text,
  p_provider        text,
  p_method          text,
  p_idempotency_key text
) returns public.charge_requests
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid     uuid := public._uid();
  v_req     public.charge_requests;
  v_wallet  public.wallets;
  v_pending int;
begin
  -- 冪等：同じキーなら既存のリクエストを返す
  select * into v_req from public.charge_requests
  where user_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    return v_req;
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_amount > 100000 then
    raise exception 'LIMIT_EXCEEDED';
  end if;
  if p_channel is null or p_channel not in ('bank', 'card', 'emoney') then
    raise exception 'INVALID_CHANNEL';
  end if;
  if p_provider is null or p_provider !~ '^[a-z0-9_]{2,32}$'
     or p_method is null or p_method !~ '^[a-z0-9_]{2,32}$' then
    raise exception 'INVALID_METHOD';
  end if;
  v_wallet := public._my_user_wallet(v_uid);
  if v_wallet.balance_cache + p_amount > 1000000 then
    raise exception 'LIMIT_EXCEEDED';
  end if;

  -- 期限切れの pending を片付けてから、同時に持てる未完了リクエスト数を制限する
  update public.charge_requests set status = 'expired', failure_code = 'EXPIRED'
  where user_id = v_uid and status = 'pending' and expires_at < now();
  select count(*) into v_pending from public.charge_requests
  where user_id = v_uid and status in ('pending', 'processing');
  if v_pending >= 5 then
    raise exception 'TOO_MANY_PENDING_CHARGES';
  end if;

  insert into public.charge_requests (user_id, channel, provider, method, amount, idempotency_key)
  values (v_uid, p_channel, p_provider, p_method, p_amount, p_idempotency_key)
  returning * into v_req;
  return v_req;
end $$;

-- -----------------------------------------------------------------------------
-- cancel_charge_request: 本人が pending をキャンセル
-- -----------------------------------------------------------------------------
create function public.cancel_charge_request(p_request_id uuid) returns public.charge_requests
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := public._uid();
  v_req public.charge_requests;
begin
  select * into v_req from public.charge_requests where id = p_request_id and user_id = v_uid for update;
  if not found then
    raise exception 'CHARGE_NOT_FOUND';
  end if;
  if v_req.status = 'cancelled' then
    return v_req;
  end if;
  if v_req.status <> 'pending' then
    raise exception 'CHARGE_NOT_PENDING';
  end if;
  update public.charge_requests set status = 'cancelled', failure_code = 'CANCELLED'
  where id = v_req.id returning * into v_req;
  return v_req;
end $$;

-- -----------------------------------------------------------------------------
-- attach_charge_provider: プロバイダ側の ID・承認画面・払込番号を紐づける（service_role）
-- -----------------------------------------------------------------------------
create function public.attach_charge_provider(
  p_request_id   uuid,
  p_provider_ref text,
  p_redirect_url text default null,
  p_instructions jsonb default null,
  p_status       text default 'pending',
  p_expires_at   timestamptz default null
) returns public.charge_requests
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare v_req public.charge_requests;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'NOT_SERVICE_ROLE';
  end if;
  if p_status not in ('pending', 'processing') then
    raise exception 'INVALID_STATUS';
  end if;
  select * into v_req from public.charge_requests where id = p_request_id for update;
  if not found then
    raise exception 'CHARGE_NOT_FOUND';
  end if;
  if v_req.status not in ('pending', 'processing') then
    raise exception 'CHARGE_NOT_PENDING';
  end if;
  update public.charge_requests
  set provider_ref = coalesce(p_provider_ref, provider_ref),
      redirect_url = coalesce(p_redirect_url, redirect_url),
      instructions = coalesce(p_instructions, instructions),
      status       = p_status,
      expires_at   = coalesce(p_expires_at, expires_at)
  where id = v_req.id returning * into v_req;
  return v_req;
end $$;

-- -----------------------------------------------------------------------------
-- complete_charge_request: プロバイダの確定通知で台帳に記帳する（service_role）
--   再送（既に completed）は同じ行を返す。記帳できない場合（残高上限など）は failed にして返す
--   （プロバイダに再送させても解決しないため例外にしない）
-- -----------------------------------------------------------------------------
create function public.complete_charge_request(
  p_request_id   uuid,
  p_provider_ref text default null,
  p_payload      jsonb default '{}'::jsonb
) returns public.charge_requests
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_req    public.charge_requests;
  v_wallet public.wallets;
  v_tx     public.transactions;
  v_code   text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'NOT_SERVICE_ROLE';
  end if;
  select * into v_req from public.charge_requests where id = p_request_id for update;
  if not found then
    raise exception 'CHARGE_NOT_FOUND';
  end if;
  if v_req.status = 'completed' then
    return v_req;                                   -- webhook 再送
  end if;
  if v_req.status in ('failed', 'cancelled') then
    raise exception 'CHARGE_NOT_PENDING';
  end if;
  if p_provider_ref is not null and v_req.provider_ref is not null and v_req.provider_ref <> p_provider_ref then
    raise exception 'PROVIDER_REF_MISMATCH';
  end if;
  v_wallet := public._my_user_wallet(v_req.user_id);

  begin
    v_tx := public._post_transaction(
      'charge', public._treasury_id(), v_wallet.id, v_req.amount,
      'charge_request:' || v_req.id::text, v_req.user_id, null, null,
      jsonb_build_object(
        'method', v_req.method, 'channel', v_req.channel, 'provider', v_req.provider,
        'provider_ref', coalesce(p_provider_ref, v_req.provider_ref), 'charge_request_id', v_req.id
      ),
      0, 1000000
    );
  exception when others then
    v_code := sqlerrm;
    update public.charge_requests
    set status = 'failed', failure_code = v_code,
        provider_ref = coalesce(p_provider_ref, provider_ref),
        metadata = metadata || jsonb_build_object('provider_payload', coalesce(p_payload, '{}'::jsonb))
    where id = v_req.id returning * into v_req;
    perform public._notify(v_req.user_id, 'charge_failed',
      format('¥%s のチャージに失敗しました', to_char(v_req.amount, 'FM999,999,999')), v_code,
      jsonb_build_object('charge_request_id', v_req.id, 'amount', v_req.amount, 'method', v_req.method, 'code', v_code));
    return v_req;
  end;

  update public.charge_requests
  set status = 'completed', transaction_id = v_tx.id, completed_at = now(),
      provider_ref = coalesce(p_provider_ref, provider_ref),
      metadata = metadata || jsonb_build_object('provider_payload', coalesce(p_payload, '{}'::jsonb))
  where id = v_req.id returning * into v_req;
  perform public._notify(v_req.user_id, 'charge_completed',
    format('¥%s をチャージしました', to_char(v_req.amount, 'FM999,999,999')), null,
    jsonb_build_object('transaction_id', v_tx.id, 'charge_request_id', v_req.id, 'amount', v_req.amount, 'method', v_req.method));
  return v_req;
end $$;

-- -----------------------------------------------------------------------------
-- fail_charge_request: プロバイダの拒否 / 取消 / 期限切れ（service_role）。終了済みの行は変更しない
-- -----------------------------------------------------------------------------
create function public.fail_charge_request(
  p_request_id uuid,
  p_code       text default 'PROVIDER_DECLINED',
  p_payload    jsonb default '{}'::jsonb
) returns public.charge_requests
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_req    public.charge_requests;
  v_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'NOT_SERVICE_ROLE';
  end if;
  select * into v_req from public.charge_requests where id = p_request_id for update;
  if not found then
    raise exception 'CHARGE_NOT_FOUND';
  end if;
  if v_req.status in ('completed', 'failed', 'cancelled', 'expired') then
    return v_req;
  end if;
  v_status := case
    when p_code = 'CANCELLED' then 'cancelled'
    when p_code = 'EXPIRED' then 'expired'
    else 'failed'
  end;
  update public.charge_requests
  set status = v_status, failure_code = coalesce(p_code, 'PROVIDER_DECLINED'),
      metadata = metadata || jsonb_build_object('provider_payload', coalesce(p_payload, '{}'::jsonb))
  where id = v_req.id returning * into v_req;
  if v_status = 'failed' then
    perform public._notify(v_req.user_id, 'charge_failed',
      format('¥%s のチャージに失敗しました', to_char(v_req.amount, 'FM999,999,999')), v_req.failure_code,
      jsonb_build_object('charge_request_id', v_req.id, 'amount', v_req.amount, 'method', v_req.method, 'code', v_req.failure_code));
  end if;
  return v_req;
end $$;

-- -----------------------------------------------------------------------------
-- 権限
-- -----------------------------------------------------------------------------
grant execute on function public.create_charge_request(bigint, text, text, text, text) to authenticated;
grant execute on function public.cancel_charge_request(uuid) to authenticated;
revoke execute on function public.attach_charge_provider(uuid, text, text, jsonb, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.complete_charge_request(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fail_charge_request(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.attach_charge_provider(uuid, text, text, jsonb, text, timestamptz) to service_role;
grant execute on function public.complete_charge_request(uuid, text, jsonb) to service_role;
grant execute on function public.fail_charge_request(uuid, text, jsonb) to service_role;
