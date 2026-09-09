import { describe, expect, it } from 'vitest';
import { manualsJa } from '@/features/guide/content/ja';
import { manualsEn } from '@/features/guide/content/en';
import { MANUAL_IDS, getManuals, isManualId } from '@/features/guide/content';

/** 節の ID とブロックの型・要素数を「構造」として取り出す */
const shape = (manuals: typeof manualsJa) =>
  manuals.map((m) => ({
    id: m.id,
    sections: m.sections.map((s) => ({
      id: s.id,
      blocks: s.blocks.map((b) => {
        switch (b.type) {
          case 'p':
          case 'note':
            return b.type;
          case 'steps':
          case 'list':
            return `${b.type}:${b.items.length}`;
          case 'table':
            return `table:${b.headers.length}x${b.rows.length}`;
        }
      }),
    })),
  }));

describe('説明書（ja / en）', () => {
  it('3種類の説明書が両言語にある', () => {
    expect(manualsJa.map((m) => m.id)).toEqual([...MANUAL_IDS]);
    expect(manualsEn.map((m) => m.id)).toEqual([...MANUAL_IDS]);
  });
  it('節 ID とブロック構成が両言語で一致する', () => {
    expect(shape(manualsEn)).toEqual(shape(manualsJa));
  });
  it('節 ID は説明書内で一意（目次アンカー用）', () => {
    for (const m of [...manualsJa, ...manualsEn]) {
      const ids = m.sections.map((s) => s.id);
      expect(new Set(ids).size, m.id).toBe(ids.length);
    }
  });
  it('表の各行は見出しと同じ列数', () => {
    for (const m of [...manualsJa, ...manualsEn]) {
      for (const s of m.sections) {
        for (const b of s.blocks) {
          if (b.type === 'table') {
            for (const row of b.rows) expect(row.length, `${m.id}/${s.id}`).toBe(b.headers.length);
          }
        }
      }
    }
  });
  it('空文字が無い', () => {
    const texts = JSON.stringify([manualsJa, manualsEn]);
    expect(texts).not.toMatch(/"(text|title|subtitle)":""/);
    expect(texts).not.toMatch(/,""/);
  });
  it('言語ごとの取得と ID 判定', () => {
    expect(getManuals('ja')[0]?.title).toBe('ユーザー向け 取扱説明書');
    expect(getManuals('en')[0]?.title).toBe('User Guide');
    expect(isManualId('merchant')).toBe(true);
    expect(isManualId('nope')).toBe(false);
    expect(isManualId(undefined)).toBe(false);
  });
});
