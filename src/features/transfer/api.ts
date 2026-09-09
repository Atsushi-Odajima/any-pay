import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/types/database';

export type PublicProfile = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
};
export type Transaction = Tables<'transactions'>;
export type SplitRequest = Tables<'split_requests'>;
export type SplitMember = Tables<'split_members'>;
export type SplitMemberWithProfile = SplitMember & { profile: PublicProfile | null };
export type SplitDetail = SplitRequest & {
  creator: PublicProfile | null;
  members: SplitMemberWithProfile[];
};

function asProfile(
  row:
    | Tables<'profiles'>
    | {
        id: string | null;
        handle: string | null;
        display_name: string | null;
        avatar_url: string | null;
      },
): PublicProfile | null {
  if (!row.id || !row.handle || !row.display_name) return null;
  return {
    id: row.id,
    handle: row.handle,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
  };
}

/** handle の前方一致検索（public_profiles ビュー経由） */
export async function searchProfiles(query: string, excludeId?: string): Promise<PublicProfile[]> {
  const q = query.trim().toLowerCase().replace(/^@/, '');
  if (q.length < 1) return [];
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, handle, display_name, avatar_url')
    .ilike('handle', `${q}%`)
    .limit(10);
  if (error) throw error;
  return data.map(asProfile).filter((p): p is PublicProfile => p !== null && p.id !== excludeId);
}

export async function fetchProfileByHandle(handle: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, handle, display_name, avatar_url')
    .eq('handle', handle.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ? asProfile(data) : null;
}

export async function fetchProfilesByIds(ids: string[]): Promise<Map<string, PublicProfile>> {
  const map = new Map<string, PublicProfile>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, handle, display_name, avatar_url')
    .in('id', ids);
  if (error) throw error;
  for (const row of data) {
    const p = asProfile(row);
    if (p) map.set(p.id, p);
  }
  return map;
}

export async function transfer(input: {
  toHandle: string;
  amount: number;
  memo?: string;
  idempotencyKey: string;
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('transfer', {
    p_to_handle: input.toHandle,
    p_amount: input.amount,
    p_memo: input.memo ?? '',
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return data;
}

export async function createSplitRequest(input: {
  total: number;
  members: Array<{ handle: string; amount: number }>;
  memo?: string;
}): Promise<SplitRequest> {
  const { data, error } = await supabase.rpc('create_split_request', {
    p_total: input.total,
    p_members: input.members,
    p_memo: input.memo ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function paySplit(input: {
  memberId: string;
  idempotencyKey: string;
}): Promise<Transaction> {
  const { data, error } = await supabase.rpc('pay_split', {
    p_split_member_id: input.memberId,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return data;
}

/** 自分が関わる割り勘（作成した / 参加している）。RLS が参加者以外を除外する */
export async function fetchMySplits(): Promise<SplitDetail[]> {
  const { data, error } = await supabase
    .from('split_requests')
    .select('*, members:split_members(*)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return attachProfiles(data);
}

export async function fetchSplit(id: string): Promise<SplitDetail | null> {
  const { data, error } = await supabase
    .from('split_requests')
    .select('*, members:split_members(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [detail] = await attachProfiles([data]);
  return detail ?? null;
}

async function attachProfiles(
  rows: Array<SplitRequest & { members: SplitMember[] }>,
): Promise<SplitDetail[]> {
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.creator_id);
    for (const m of r.members) ids.add(m.user_id);
  }
  const profiles = await fetchProfilesByIds([...ids]);
  return rows.map((r) => ({
    ...r,
    creator: profiles.get(r.creator_id) ?? null,
    members: r.members.map((m) => ({ ...m, profile: profiles.get(m.user_id) ?? null })),
  }));
}
