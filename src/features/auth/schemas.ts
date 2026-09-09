import { z } from 'zod';

// メッセージは辞書キー。表示時に t() で翻訳する
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, 'validation.handle');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'validation.displayNameRequired')
  .max(40, 'validation.displayNameMax');

export const profileFormSchema = z.object({
  handle: handleSchema,
  display_name: displayNameSchema,
});
export type ProfileForm = z.infer<typeof profileFormSchema>;
