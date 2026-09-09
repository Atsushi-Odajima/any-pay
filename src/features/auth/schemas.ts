import { z } from 'zod';

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, '3〜20文字の英小文字・数字・_ で入力してください');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, '表示名を入力してください')
  .max(40, '40文字以内で入力してください');

export const profileFormSchema = z.object({
  handle: handleSchema,
  display_name: displayNameSchema,
});
export type ProfileForm = z.infer<typeof profileFormSchema>;
