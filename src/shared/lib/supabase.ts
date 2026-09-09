import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env, isSupabaseConfigured } from './env';

// 未設定でもアプリが起動できるようダミー値で生成し、画面側で設定案内を出す
export const supabase = createClient<Database>(
  isSupabaseConfigured ? env.supabaseUrl : 'http://localhost:54321',
  isSupabaseConfigured ? env.supabaseAnonKey : 'anon-key-not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
