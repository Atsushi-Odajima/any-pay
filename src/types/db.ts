// `supabase gen types` の出力（database.ts）には無い補助型。生成ファイルを差し替えても壊れないよう分離
import type { Database } from './database';

type PublicSchema = Database['public'];

export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row'];
export type FunctionArgs<T extends keyof PublicSchema['Functions']> =
  PublicSchema['Functions'][T]['Args'];
export type FunctionReturns<T extends keyof PublicSchema['Functions']> =
  PublicSchema['Functions'][T]['Returns'];
