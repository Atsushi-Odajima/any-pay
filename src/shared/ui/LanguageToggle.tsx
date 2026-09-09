import { useLocale } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

/** 日本語 ⇄ English 切替ピル */
export function LanguageToggle({ className }: { className?: string }) {
  const [locale, setLocale] = useLocale();
  return (
    <div
      className={cn('inline-flex rounded-full bg-ink-800 p-0.5 text-xs font-semibold', className)}
      role="group"
      aria-label="Language"
    >
      {(['ja', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
          className={cn(
            'rounded-full px-2.5 py-1 transition-colors',
            locale === l ? 'bg-lime text-ink' : 'text-mist hover:text-white',
          )}
        >
          {l === 'ja' ? '日本語' : 'EN'}
        </button>
      ))}
    </div>
  );
}
