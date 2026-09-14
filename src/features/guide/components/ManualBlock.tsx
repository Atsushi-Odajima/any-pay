import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { Block } from '../content';

/** 説明書の1ブロック（段落 / 手順 / 箇条書き / 注記 / 表）を描画する。印刷時は白黒 */
export function ManualBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p className="text-sm leading-relaxed text-fg/90 print:text-black">{block.text}</p>;
    case 'steps':
      return (
        <ol className="flex flex-col gap-2">
          {block.items.map((item, i) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white print:border print:border-black print:bg-transparent print:text-black">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-fg/90 print:text-black">{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'list':
      return (
        <ul className="flex flex-col gap-1.5">
          {block.items.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-sm leading-relaxed text-fg/90 print:text-black"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand print:bg-black" />
              <span className="min-w-0 flex-1">{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'note': {
      const warn = block.tone === 'warn';
      return (
        <div
          className={cn(
            'flex gap-2 rounded-xl p-3 text-xs leading-relaxed',
            warn ? 'bg-warn/10 text-warn' : 'bg-surface-2 text-muted',
            'print:border print:border-black print:bg-transparent print:text-black',
          )}
        >
          {warn ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1">{block.text}</span>
        </div>
      );
    }
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-line print:border-black">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs text-muted print:bg-transparent print:text-black">
              <tr>
                {block.headers.map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')} className="border-t border-line print:border-black">
                  {row.map((cell, j) => (
                    <td
                      key={`${j}:${cell}`}
                      className="px-3 py-2 align-top text-fg/90 print:text-black"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
