import { z } from 'zod';
import { supabase } from '@/shared/lib/supabase';

const pinStatusSchema = z.object({
  has_pin: z.boolean(),
  locked_until: z.string().nullable(),
  failed_count: z.number(),
  verified_at: z.string().nullable(),
  verified: z.boolean(),
});
export type PinStatus = z.infer<typeof pinStatusSchema>;

const verifyResultSchema = z.object({
  ok: z.boolean(),
  remaining: z.number(),
  locked_until: z.string().nullable(),
});
export type VerifyResult = z.infer<typeof verifyResultSchema>;

export async function fetchPinStatus(): Promise<PinStatus> {
  const { data, error } = await supabase.rpc('pin_status');
  if (error) throw error;
  return pinStatusSchema.parse(data);
}

export async function setPin(pin: string, currentPin?: string): Promise<void> {
  const { error } = await supabase.rpc('set_pin', {
    p_pin: pin,
    p_current_pin: currentPin ?? null,
  });
  if (error) throw error;
}

export async function verifyPin(pin: string): Promise<VerifyResult> {
  const { data, error } = await supabase.rpc('verify_pin', { p_pin: pin });
  if (error) throw error;
  return verifyResultSchema.parse(data);
}
