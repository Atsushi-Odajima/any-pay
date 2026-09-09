-- =============================================================================
-- 0001_schema.sql — Phase 1: enum / テーブル / トリガー / ビュー / RLS / 権限
-- 既存ファイルは編集しない（以降は追記のみ）
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- enum
-- -----------------------------------------------------------------------------
create type public.wallet_kind as enum ('user', 'merchant', 'system');
create type public.tx_type     as enum ('charge', 'payment', 'transfer', 'withdrawal', 'refund', 'split');
create type public.tx_status   as enum ('pending', 'completed', 'failed', 'refunded');
create type public.user_role   as enum ('user', 'merchant', 'admin');

-- -----------------------------------------------------------------------------
-- テーブル
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  handle       text unique not null check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  role         public.user_role not null default 'user',
  pin_hash     text,
  created_at   timestamptz not null default now()
);

create table public.wallets (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references public.profiles(id),
  kind          public.wallet_kind not null,
  balance_cache bigint not null default 0,
  updated_at    timestamptz not null default now(),
  constraint non_negative check (kind = 'system' or balance_cache >= 0),
  constraint system_has_no_owner check ((kind = 'system') = (owner_id is null))
);
create index wallets_owner_idx on public.wallets (owner_id);

create table public.merchants (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id),
  wallet_id  uuid not null unique references public.wallets(id),
  name       text not null check (char_length(name) between 1 and 60),
  category   text,
  address    text,
  logo_url   text,
  created_at timestamptz not null default now()
);
create index merchants_owner_idx on public.merchants (owner_id);

create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  type            public.tx_type not null,
  status          public.tx_status not null default 'pending',
  amount          bigint not null check (amount > 0),
  from_wallet_id  uuid references public.wallets(id),
  to_wallet_id    uuid references public.wallets(id),
  merchant_id     uuid references public.merchants(id),
  memo            text,
  idempotency_key text unique not null,
  created_by      uuid not null references public.profiles(id),
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index transactions_from_idx on public.transactions (from_wallet_id, created_at desc);
create index transactions_to_idx on public.transactions (to_wallet_id, created_at desc);
create index transactions_merchant_idx on public.transactions (merchant_id, created_at desc);
create index transactions_created_by_idx on public.transactions (created_by, created_at desc);

create table public.ledger_entries (
  id             bigserial primary key,
  transaction_id uuid not null references public.transactions(id),
  wallet_id      uuid not null references public.wallets(id),
  amount         bigint not null check (amount <> 0),
  balance_after  bigint not null,
  created_at     timestamptz not null default now()
);
create index ledger_entries_wallet_idx on public.ledger_entries (wallet_id, id desc);
create index ledger_entries_tx_idx on public.ledger_entries (transaction_id);

create table public.qr_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id),
  token      text unique not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index qr_tokens_user_idx on public.qr_tokens (user_id, created_at desc);

create table public.payment_requests (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references public.merchants(id),
  amount              bigint not null check (amount > 0),
  memo                text,
  status              text not null default 'open' check (status in ('open', 'paid', 'expired', 'cancelled')),
  expires_at          timestamptz not null,
  paid_transaction_id uuid references public.transactions(id),
  created_at          timestamptz not null default now()
);
create index payment_requests_merchant_idx on public.payment_requests (merchant_id, created_at desc);

create table public.split_requests (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles(id),
  total_amount bigint not null check (total_amount > 0),
  memo         text,
  created_at   timestamptz not null default now()
);
create table public.split_members (
  id                  uuid primary key default gen_random_uuid(),
  split_request_id    uuid not null references public.split_requests(id),
  user_id             uuid not null references public.profiles(id),
  amount              bigint not null check (amount > 0),
  paid_transaction_id uuid references public.transactions(id),
  unique (split_request_id, user_id)
);
create index split_members_user_idx on public.split_members (user_id);

create table public.coupons (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid references public.merchants(id),
  title         text not null,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  value         int not null check (value > 0),
  min_amount    bigint not null default 0,
  valid_from    timestamptz not null default now(),
  valid_until   timestamptz not null,
  max_uses      int,
  constraint percent_max_100 check (discount_type <> 'percent' or value <= 100)
);
create table public.user_coupons (
  id             uuid primary key default gen_random_uuid(),
  coupon_id      uuid not null references public.coupons(id),
  user_id        uuid not null references public.profiles(id),
  used_at        timestamptz,
  transaction_id uuid references public.transactions(id),
  unique (coupon_id, user_id)
);
create index user_coupons_user_idx on public.user_coupons (user_id);

create table public.point_entries (
  id             bigserial primary key,
  user_id        uuid not null references public.profiles(id),
  delta          int not null,
  reason         text not null,
  transaction_id uuid references public.transactions(id),
  created_at     timestamptz not null default now()
);
create index point_entries_user_idx on public.point_entries (user_id, id desc);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id),
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 内部ヘルパー
-- -----------------------------------------------------------------------------

-- 認証済み uid を返す。未認証なら NOT_AUTHENTICATED
create function public._uid() returns uuid
language plpgsql stable
set search_path = public, extensions, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  return v_uid;
end $$;

-- RLS 用：自分が所有する wallet id（user wallet + 自店の merchant wallet）
create function public.my_wallet_ids() returns setof uuid
language sql stable security definer
set search_path = public, extensions, pg_temp
as $$
  select id from public.wallets where owner_id = auth.uid()
$$;

-- RLS 用：自分がオーナーの merchant id
create function public.my_merchant_ids() returns setof uuid
language sql stable security definer
set search_path = public, extensions, pg_temp
as $$
  select id from public.merchants where owner_id = auth.uid()
$$;

-- RLS 用：割り勘の参加者（作成者 or メンバー）か
create function public.is_split_participant(p_split_request_id uuid) returns boolean
language sql stable security definer
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.split_requests r where r.id = p_split_request_id and r.creator_id = auth.uid()
  ) or exists (
    select 1 from public.split_members m where m.split_request_id = p_split_request_id and m.user_id = auth.uid()
  )
$$;

-- -----------------------------------------------------------------------------
-- トリガー：profiles INSERT → user wallet を自動作成
-- -----------------------------------------------------------------------------
create function public.handle_new_profile() returns trigger
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.wallets (owner_id, kind) values (new.id, 'user');
  return new;
end $$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- -----------------------------------------------------------------------------
-- ビュー
-- -----------------------------------------------------------------------------
-- 送金相手検索用。pin_hash / role は露出しない（security definer で全行を見せる）
create view public.public_profiles as
  select id, handle, display_name, avatar_url from public.profiles;

-- 本人のポイント残高（security_invoker で point_entries の RLS を適用）
create view public.point_balances with (security_invoker = true) as
  select user_id, coalesce(sum(delta), 0)::bigint as balance
  from public.point_entries
  group by user_id;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.wallets          enable row level security;
alter table public.merchants        enable row level security;
alter table public.transactions     enable row level security;
alter table public.ledger_entries   enable row level security;
alter table public.qr_tokens        enable row level security;
alter table public.payment_requests enable row level security;
alter table public.split_requests   enable row level security;
alter table public.split_members    enable row level security;
alter table public.coupons          enable row level security;
alter table public.user_coupons     enable row level security;
alter table public.point_entries    enable row level security;
alter table public.notifications    enable row level security;

-- profiles: 本人のみ
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- wallets: owner のみ SELECT、書き込みはRPCのみ
create policy wallets_select_own on public.wallets
  for select to authenticated using (owner_id = (select auth.uid()));

-- merchants: 公開情報。更新は owner のみ（列は grant で制限）
create policy merchants_select_all on public.merchants
  for select to authenticated using (true);
create policy merchants_update_owner on public.merchants
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- transactions / ledger_entries: 自分の wallet が関与する行（加盟店オーナーは自店 wallet 経由で見える）
create policy transactions_select_involved on public.transactions
  for select to authenticated using (
    from_wallet_id in (select public.my_wallet_ids())
    or to_wallet_id in (select public.my_wallet_ids())
    or merchant_id in (select public.my_merchant_ids())
  );
create policy ledger_select_own_wallet on public.ledger_entries
  for select to authenticated using (wallet_id in (select public.my_wallet_ids()));

-- qr_tokens / payment_requests: 発行者のみ
create policy qr_tokens_select_own on public.qr_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy payment_requests_select_owner on public.payment_requests
  for select to authenticated using (merchant_id in (select public.my_merchant_ids()));

-- split: 参加者のみ
create policy split_requests_select_participant on public.split_requests
  for select to authenticated using (public.is_split_participant(id));
create policy split_members_select_participant on public.split_members
  for select to authenticated using (public.is_split_participant(split_request_id));

-- coupons: 全ユーザー閲覧、書き込みは merchant owner（全店共通クーポンは管理者が seed で作成）
create policy coupons_select_all on public.coupons
  for select to authenticated using (true);
create policy coupons_insert_owner on public.coupons
  for insert to authenticated with check (merchant_id in (select public.my_merchant_ids()));
create policy coupons_update_owner on public.coupons
  for update to authenticated using (merchant_id in (select public.my_merchant_ids()))
  with check (merchant_id in (select public.my_merchant_ids()));
create policy coupons_delete_owner on public.coupons
  for delete to authenticated using (merchant_id in (select public.my_merchant_ids()));

-- user_coupons / point_entries / notifications: 本人のみ
create policy user_coupons_select_own on public.user_coupons
  for select to authenticated using (user_id = (select auth.uid()));
create policy point_entries_select_own on public.point_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 権限（Supabase は新規テーブルに ALL を default grant するため、明示的に剥奪してから必要分だけ付与）
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.profiles, public.wallets, public.merchants, public.transactions,
  public.ledger_entries, public.qr_tokens, public.payment_requests, public.split_requests,
  public.split_members, public.coupons, public.user_coupons, public.point_entries,
  public.notifications to authenticated;

grant insert (id, handle, display_name, avatar_url) on public.profiles to authenticated;
grant update (handle, display_name, avatar_url) on public.profiles to authenticated;
grant update (name, category, address, logo_url) on public.merchants to authenticated;
grant insert, update, delete on public.coupons to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on public.public_profiles, public.point_balances to authenticated;

-- 内部関数は直接呼べない
revoke execute on function public._uid() from public, anon, authenticated;
revoke execute on function public.handle_new_profile() from public, anon, authenticated;
grant execute on function public.my_wallet_ids(), public.my_merchant_ids(),
  public.is_split_participant(uuid) to authenticated;
