-- =============================================================================
-- 0010: 通知 data の補完（多言語表示のため）
--   クライアントは notifications.data から現在の言語で文言を組み立てる（features/notifications/format.ts）。
--   title / body（日本語）は互換のため従来どおり保存し、data が不足する古い通知のフォールバックに使う。
--   各 RPC 本体は変更せず、_notify が transactions.metadata / split_requests から必要な値を補う。
-- =============================================================================

create or replace function public._notify(
  p_user_id uuid, p_type text, p_title text, p_body text, p_data jsonb default '{}'::jsonb
) returns void
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_data      jsonb := coalesce(p_data, '{}'::jsonb);
  v_extra     jsonb := '{}'::jsonb;
  v_tx        public.transactions;
  v_req       public.split_requests;
  v_creator   public.profiles;
  v_remaining int;
begin
  -- 取引に紐づく通知：店名・相手・メモ・ポイントを metadata から補う
  if v_data ? 'transaction_id' then
    select * into v_tx from public.transactions where id = (v_data ->> 'transaction_id')::uuid;
    if found then
      v_extra := jsonb_build_object(
        'merchant_name', v_tx.metadata ->> 'merchant_name',
        'payer_name',    v_tx.metadata ->> 'payer_name',
        'payer_handle',  v_tx.metadata ->> 'payer_handle',
        'from_name',     v_tx.metadata ->> 'from_name',
        'from_handle',   v_tx.metadata ->> 'from_handle',
        'memo',          nullif(trim(coalesce(v_tx.memo, '')), ''),
        'points',        abs(coalesce((v_tx.metadata ->> 'points')::int, 0))
      );
      -- 割り勘の支払い：支払者は from_*、残人数は split_members から
      if p_type = 'split_paid' then
        v_extra := v_extra || jsonb_build_object(
          'payer_name',   v_tx.metadata ->> 'from_name',
          'payer_handle', v_tx.metadata ->> 'from_handle'
        );
        if v_data ? 'split_request_id' then
          select count(*) into v_remaining from public.split_members
          where split_request_id = (v_data ->> 'split_request_id')::uuid
            and paid_transaction_id is null;
          v_extra := v_extra || jsonb_build_object('remaining', v_remaining);
        end if;
      end if;
    end if;
  -- 割り勘リクエスト：作成者名とメモ
  elsif p_type = 'split_requested' and v_data ? 'split_request_id' then
    select * into v_req from public.split_requests where id = (v_data ->> 'split_request_id')::uuid;
    if found then
      select * into v_creator from public.profiles where id = v_req.creator_id;
      v_extra := jsonb_build_object(
        'creator_name',   v_creator.display_name,
        'creator_handle', v_creator.handle,
        'memo',           nullif(trim(coalesce(v_req.memo, '')), '')
      );
    end if;
  end if;

  -- 呼び出し元が明示した値を優先し、null は落とす
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, p_type, p_title, p_body, jsonb_strip_nulls(v_extra) || v_data);
end $$;
