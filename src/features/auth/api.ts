import type { Session } from '@supabase/supabase-js';
export type { Session };
import { supabase } from '@/shared/lib/supabase';
import { tr } from '@/shared/i18n';
import type { Tables } from '@/types/database';

export type Profile = Omit<Tables<'profiles'>, 'pin_hash'> & { has_pin: boolean };

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function sendOtp(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyOtp(phone: string, token: string): Promise<Session> {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
  if (!data.session) throw new Error(tr('errors.sessionMissing'));
  return data.session;
}

/** 管理者・デモ用の ID / パスワードログイン。ID を固定ドメインのメールに変換して Supabase の email/password 認証を使う */
export const ADMIN_EMAIL_DOMAIN = 'any-pay.pages.dev';

export async function signInWithPassword(id: string, password: string): Promise<Session> {
  const email = `${id.trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error(tr('errors.sessionMissing'));
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** 自分のプロフィール。未作成（オンボーディング前）なら null */
export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url, role, created_at, pin_hash')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { pin_hash, ...rest } = data;
  return { ...rest, has_pin: pin_hash !== null };
}

export async function createProfile(input: {
  id: string;
  handle: string;
  display_name: string;
}): Promise<void> {
  const { error } = await supabase.from('profiles').insert(input);
  if (error) {
    if (error.code === '23505') throw new Error('HANDLE_TAKEN');
    throw error;
  }
}

export async function updateProfile(
  userId: string,
  patch: { handle?: string; display_name?: string; avatar_url?: string | null },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) {
    if (error.code === '23505') throw new Error('HANDLE_TAKEN');
    throw error;
  }
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id')
    .eq('handle', handle)
    .maybeSingle();
  if (error) throw error;
  return data === null;
}
