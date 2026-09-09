// import.meta.env はここでのみ参照する（CLAUDE.md §6）
const raw = import.meta.env;

export const env = {
  supabaseUrl: raw.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: raw.VITE_SUPABASE_ANON_KEY ?? '',
  appName: raw.VITE_APP_NAME ?? 'Any Pay',
  isDev: raw.DEV,
} as const;

export const isSupabaseConfigured = env.supabaseUrl !== '' && env.supabaseAnonKey !== '';
