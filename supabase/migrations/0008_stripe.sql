-- =============================================================================
-- 0008_stripe.sql — Phase 8: Stripe（テストモード）チャージ用
--   charge_wallet_for: Edge Function（service_role）が webhook から呼ぶ。ユーザーは呼べない
-- =============================================================================

create function public.charge_wallet_for(
  p_user_id         uuid,
  p_amount          bigint,
  p_method          text,
  p_idempotency_key text,
  p_metadata        jsonb default '{}'::jsonb
) returns public.transactions
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_wallet public.wallets;
begin
  -- service_role の JWT（Edge Function）からのみ。authenticated / anon は拒否
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'NOT_SERVICE_ROLE';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_amount > 100000 then
    raise exception 'LIMIT_EXCEEDED';
  end if;
  if p_method not in ('stripe') then
    raise exception 'INVALID_METHOD';
  end if;
  v_wallet := public._my_user_wallet(p_user_id);
  return public._post_transaction(
    'charge', public._treasury_id(), v_wallet.id, p_amount, p_idempotency_key, p_user_id,
    null, null, jsonb_build_object('method', p_method) || coalesce(p_metadata, '{}'::jsonb), 0, 1000000
  );
end $$;

revoke execute on function public.charge_wallet_for(uuid, bigint, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.charge_wallet_for(uuid, bigint, text, text, jsonb) to service_role;
