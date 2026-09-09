/** 説明書の構造。ja / en で同じ構造を持つ（tests/unit/guide.test.ts で検証） */
export type ManualId = 'user' | 'merchant' | 'admin';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'note'; text: string; tone?: 'info' | 'warn' }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Manual {
  id: ManualId;
  title: string;
  subtitle: string;
  sections: Section[];
}
