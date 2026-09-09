-- =============================================================================
-- 0005_merchant.sql — Phase 5: 加盟店ダッシュボード
--   refund_transaction / merchant_today_summary
-- =============================================================================

-- -----------------------------------------------------------------------------
-- refund_transaction: 逆仕訳で全額返金。元取引を refunded に。ポイント取消・クーポン復活
--   冪等キーは 'refund:' || 元取引id（同じ取引の返金は1回だけ）
-- -----------------------------------------------------------------------------
create function public.refund_transaction(p_transaction_id uuid) returns public.transactions
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid     uuid := public._uid();
  v_orig    public.transactions;
  v_m       public.merchants;
  v_payer   public.profiles;
  v_points  int;
  v_subsidy bigint;
  v_refund  public.transactions;
begin
  select * into v_orig from public.transactions where id = p_transaction_id for update;
  if v_orig.id is null then
    raise exception 'TRANSACTION_NOT_FOUND';
  end if;
  if v_orig.type <> 'payment' or v_orig.merchant_id is null then
    raise exception 'NOT_REFUNDABLE';
  end if;
  v_m := public._require_merchant_owner(v_orig.merchant_id, v_uid);
  if v_orig.status = 'refunded' then
    raise exception 'ALREADY_REFUNDED';
  end if;
  if v_orig.status <> 'completed' then
    raise exception 'NOT_REFUNDABLE';
  end if;

  select * into v_payer from public.profiles where id = (v_orig.metadata ->> 'payer_id')::uuid;
  v_points  := coalesce((v_orig.metadata ->> 'points')::int, 0);
  v_subsidy := coalesce((v_orig.metadata ->> 'subsidy')::bigint, 0);

  -- 加盟店 → 支払者。全店共通クーポンの補填分は加盟店 → treasury へ戻す（p_subsidy < 0）
  v_refund := public._post_transaction(
    'refund', v_orig.to_wallet_id, v_orig.from_wallet_id, v_orig.amount,
    'refund:' || v_orig.id::text, v_uid, v_m.id, v_orig.memo,
    jsonb_build_object(
      'refund_of', v_orig.id,
      'merchant_name', v_m.name,
      'payer_id', v_payer.id, 'payer_handle', v_payer.handle, 'payer_name', v_payer.display_name,
      'points', -v_points
    ),
    -v_subsidy
  );

  update public.transactions
  set status = 'refunded',
      metadata = metadata || jsonb_build_object('refund_transaction_id', v_refund.id)
  where id = v_orig.id;

  if v_points > 0 then
    insert into public.point_entries (user_id, delta, reason, transaction_id)
    values (v_payer.id, -v_points, 'refund', v_refund.id);
  end if;
  update public.user_coupons set used_at = null, transaction_id = null where transaction_id = v_orig.id;

  perform public._notify(v_payer.id, 'refund_received',
    format('%s から ¥%s が返金されました', v_m.name, to_char(v_orig.amount, 'FM999,999,999')),
    case when v_points > 0 then format('%s ポイントを取り消しました', v_points) else null end,
    jsonb_build_object('transaction_id', v_refund.id, 'amount', v_orig.amount, 'merchant_id', v_m.id));
  return v_refund;
end $$;

-- -----------------------------------------------------------------------------
-- merchant_today_summary: 本日（JST）の売上・件数・返金
-- -----------------------------------------------------------------------------
create function public.merchant_today_summary(p_merchant_id uuid) returns jsonb
language plpgsql security definer stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid   uuid := public._uid();
  v_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Tokyo')) at time zone 'Asia/Tokyo';
  v_sales bigint; v_count int; v_refunds bigint; v_refund_count int;
begin
  perform public._require_merchant_owner(p_merchant_id, v_uid);
  select coalesce(sum(amount), 0), count(*) into v_sales, v_count
  from public.transactions
  where merchant_id = p_merchant_id and type = 'payment' and status in ('completed', 'refunded')
    and created_at >= v_start;
  select coalesce(sum(amount), 0), count(*) into v_refunds, v_refund_count
  from public.transactions
  where merchant_id = p_merchant_id and type = 'refund' and created_at >= v_start;
  return jsonb_build_object(
    'sales', v_sales, 'count', v_count,
    'refunds', v_refunds, 'refund_count', v_refund_count,
    'net', v_sales - v_refunds,
    'since', v_start
  );
end $$;

grant execute on function public.refund_transaction(uuid) to authenticated;
grant execute on function public.merchant_today_summary(uuid) to authenticated;
