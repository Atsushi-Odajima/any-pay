import { supabase } from '@/shared/lib/supabase';
import { z } from 'zod';

const tokenResult = z.object({ token: z.string(), expires_at: z.string() });
export type QrToken = z.infer<typeof tokenResult>;

export async function createQrToken(): Promise<QrToken> {
  const { data, error } = await supabase.rpc('create_qr_token');
  if (error) throw error;
  return tokenResult.parse(data);
}
