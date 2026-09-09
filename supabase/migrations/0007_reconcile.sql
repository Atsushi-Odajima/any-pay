-- =============================================================================
-- 0007_reconcile.sql — Phase 7: 突合（balance_cache と台帳合計の不一致検出）
-- =============================================================================

-- admin のみ。全 wallet について balance_cache と sum(ledger_entries.amount) を比較し、不一致行を返す
create function public.reconcile_wallets()
returns table (
  wallet_id     uuid,
  kind          public.wallet_kind,
  owner_id      uuid,
  owner_handle  text,
  balance_cache bigint,
  ledger_sum    bigint,
  diff          bigint
)
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid  uuid := public._uid();
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'admin' then
    raise exception 'NOT_ADMIN';
  end if;
  return query
    select w.id, w.kind, w.owner_id, p.handle, w.balance_cache,
           coalesce(l.s, 0)::bigint, (w.balance_cache - coalesce(l.s, 0))::bigint
    from public.wallets w
    left join public.profiles p on p.id = w.owner_id
    left join (select le.wallet_id, sum(le.amount) as s from public.ledger_entries le group by le.wallet_id) l
      on l.wallet_id = w.id
    where w.balance_cache <> coalesce(l.s, 0)
    order by w.kind, p.handle;
end $$;

-- admin 向けの統計（wallet 数・取引数・台帳合計。台帳合計は常に 0 のはず）
create function public.ledger_stats() returns jsonb
language plpgsql security definer stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid  uuid := public._uid();
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'admin' then
    raise exception 'NOT_ADMIN';
  end if;
  return jsonb_build_object(
    'wallets', (select count(*) from public.wallets),
    'transactions', (select count(*) from public.transactions),
    'ledger_entries', (select count(*) from public.ledger_entries),
    'ledger_sum', (select coalesce(sum(amount), 0) from public.ledger_entries),
    'treasury_balance', (select balance_cache from public.wallets where id = public._treasury_id()),
    'user_balance_total', (select coalesce(sum(balance_cache), 0) from public.wallets where kind <> 'system')
  );
end $$;

grant execute on function public.reconcile_wallets() to authenticated;
grant execute on function public.ledger_stats() to authenticated;
