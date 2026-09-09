-- Phase 4: 送金・割り勘
begin;

select tests.create_user('alice', 'Alice');
select tests.create_user('bob', 'Bob');
select tests.create_user('carol', 'Carol');
select tests.create_user('dave', 'Dave');

select tests.login(tests.uid('alice'));
select public.charge_wallet(50000, 'bank', 'p4-charge-alice');
select tests.login(tests.uid('bob'));
select public.charge_wallet(10000, 'bank', 'p4-charge-bob');
select tests.login(tests.uid('carol'));
select public.charge_wallet(10000, 'bank', 'p4-charge-carol');

-- ===== transfer =====
select tests.login(tests.uid('alice'));
do $$
declare tx public.transactions;
begin
  tx := public.transfer('bob', 3000, 'ランチ代', 'p4-transfer-1');
  assert tx.type = 'transfer' and tx.amount = 3000 and tx.memo = 'ランチ代', 'transfer 3000';
  assert (tx.metadata ->> 'to_handle') = 'bob' and (tx.metadata ->> 'from_handle') = 'alice', 'metadata';
  assert (select balance_cache from public.wallets where kind = 'user') = 47000, 'alice 47000';
  assert (public.transfer('bob', 3000, 'ランチ代', 'p4-transfer-1')).id = tx.id, 'リプレイ';
  assert (select balance_cache from public.wallets where kind = 'user') = 47000, 'リプレイで残高は変わらない';
  -- handle は大文字・空白を許容
  tx := public.transfer(' BOB ', 100, null, 'p4-transfer-2');
  assert tx.amount = 100, 'handle 正規化';
end $$;
select tests.ok('transfer 成功 + 冪等');

select tests.expect_error('select public.transfer(''alice'', 100, null, ''p4-transfer-self'')', '^SELF_TRANSFER$');
select tests.expect_error('select public.transfer(''nobody'', 100, null, ''p4-transfer-nobody'')', '^USER_NOT_FOUND$');
select tests.expect_error('select public.transfer(''bob'', 50001, null, ''p4-transfer-limit'')', '^LIMIT_EXCEEDED$');
select tests.expect_error('select public.transfer(''bob'', 0, null, ''p4-transfer-zero'')', '^INVALID_AMOUNT$');
select tests.expect_error('select public.transfer(''bob'', 47000, null, ''p4-transfer-insufficient'')', '^INSUFFICIENT_FUNDS$');
select tests.ok('自分宛て / 不明な相手 / 上限 / 0円 / 残高不足 を拒否');

-- 受け取り側の残高・履歴・通知
select tests.login(tests.uid('bob'));
do $$ begin
  assert (select balance_cache from public.wallets where kind = 'user') = 13100, 'bob 13100';
  assert (select count(*) from public.transactions where type = 'transfer') = 2, 'bob から transfer が2件見える';
  assert (select count(*) from public.ledger_entries) = 3, 'bob の ledger 3行（charge + transfer 2）';
  assert (select balance_after from public.ledger_entries order by id desc limit 1) = 13100, 'balance_after';
  assert (select count(*) from public.notifications where type = 'transfer_received') = 2, '受取通知 2件';
end $$;
-- 第三者には見えない
select tests.login(tests.uid('dave'));
do $$ begin
  assert (select count(*) from public.transactions) = 0, 'dave には他人の取引が見えない';
end $$;
select tests.ok('A→B 送金後に両者の履歴と残高が整合、第三者には不可視');

-- ===== 割り勘 =====
select tests.login(tests.uid('alice'));
select tests.expect_error(
  'select public.create_split_request(6000, ''[{"handle":"bob","amount":3000},{"handle":"carol","amount":2000}]'', ''飲み会'')',
  '^SPLIT_TOTAL_MISMATCH$');
select tests.expect_error(
  'select public.create_split_request(6000, ''[{"handle":"bob","amount":3000},{"handle":"nobody","amount":3000}]'', ''飲み会'')',
  '^SPLIT_MEMBER_NOT_FOUND$');
select tests.expect_error(
  'select public.create_split_request(6000, ''[{"handle":"bob","amount":3000},{"handle":"alice","amount":3000}]'', ''飲み会'')',
  '^SPLIT_CREATOR_INCLUDED$');
select tests.expect_error(
  'select public.create_split_request(6000, ''[{"handle":"bob","amount":3000},{"handle":"bob","amount":3000}]'', ''飲み会'')',
  '^SPLIT_MEMBER_DUPLICATE$');
select tests.expect_error('select public.create_split_request(6000, ''[]'', ''飲み会'')', '^SPLIT_MEMBERS_REQUIRED$');
select tests.ok('create_split_request の検証（合計不一致 / 不明 / 作成者含む / 重複 / 空）');

create temp table t_split as
  select public.create_split_request(6000, '[{"handle":"bob","amount":3000},{"handle":"carol","amount":3000}]', '飲み会') as r;
do $$
declare r public.split_requests := (select r from t_split);
begin
  assert r.total_amount = 6000 and r.memo = '飲み会', 'split_request';
  assert (select count(*) from public.split_members where split_request_id = r.id) = 2, 'メンバー2人（作成者から見える）';
end $$;
select tests.login(tests.uid('bob'));
do $$ begin
  assert (select count(*) from public.split_requests) = 1, 'bob は参加している割り勘を見られる';
  assert (select count(*) from public.split_members) = 2, 'bob は同じ割り勘の全メンバーを見られる';
  assert (select count(*) from public.notifications where type = 'split_requested') = 1, 'bob に通知';
end $$;
select tests.login(tests.uid('dave'));
do $$ begin
  assert (select count(*) from public.split_requests) = 0, '無関係の dave には見えない';
  assert (select count(*) from public.split_members) = 0, 'メンバー行も見えない';
end $$;
select tests.ok('割り勘作成 → 参加者のみ閲覧可・通知');

-- dave（非メンバー）は支払えない（メンバー id は superuser で取得しておく）
select tests.logout();
select m.id as bob_member from public.split_members m join public.profiles p on p.id = m.user_id where p.handle = 'bob' \gset
select tests.login(tests.uid('dave'));
select tests.expect_error(
  format('select public.pay_split(%L, ''p4-split-dave'')', :'bob_member'),
  '^SPLIT_MEMBER_NOT_FOUND$');
-- bob が支払う
select tests.login(tests.uid('bob'));
do $$
declare tx public.transactions; mid uuid := (select id from public.split_members where user_id = tests.uid('bob'));
begin
  tx := public.pay_split(mid, 'p4-split-bob');
  assert tx.type = 'split' and tx.amount = 3000 and tx.memo = '飲み会', 'split 3000';
  assert (select paid_transaction_id from public.split_members where id = mid) = tx.id, 'paid_transaction_id';
  assert (select balance_cache from public.wallets where kind = 'user') = 10100, 'bob 10100';
  assert (public.pay_split(mid, 'p4-split-bob')).id = tx.id, 'リプレイ';
end $$;
select tests.expect_error(
  format('select public.pay_split(%L, ''p4-split-bob-2'')', (select id from public.split_members where user_id = tests.uid('bob'))),
  '^ALREADY_PAID$');
select tests.ok('pay_split（本人のみ・二重支払い拒否）');

-- carol が支払う → 全員完了
select tests.login(tests.uid('carol'));
select public.pay_split((select id from public.split_members where user_id = tests.uid('carol')), 'p4-split-carol');
select tests.login(tests.uid('alice'));
do $$ begin
  assert (select count(*) from public.split_members where paid_transaction_id is null) = 0, '全員支払い済み';
  assert (select balance_cache from public.wallets where kind = 'user') = 47000 - 100 + 6000, 'alice に 6000 入金';
  assert (select count(*) from public.notifications where type = 'split_paid') = 2, 'split_paid 通知 2件';
  assert exists (select 1 from public.notifications where type = 'split_paid' and body = '全員の支払いが完了しました'), '完了通知';
end $$;
select tests.ok('3人の割り勘で全員支払い後に完了');

-- 台帳整合
select tests.logout();
do $$ begin
  assert (select sum(amount) from public.ledger_entries) = 0, 'ledger 合計 0';
  assert not exists (
    select 1 from public.wallets w
    left join (select wallet_id, sum(amount) s from public.ledger_entries group by wallet_id) l on l.wallet_id = w.id
    where w.balance_cache <> coalesce(l.s, 0)
  ), 'balance_cache = sum(ledger)';
end $$;
select tests.ok('台帳整合');

rollback;
