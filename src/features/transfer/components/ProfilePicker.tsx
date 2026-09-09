import { useState } from 'react';
import { AtSign, Search } from 'lucide-react';
import { Avatar, Card, EmptyState, Input, ListRow, Spinner } from '@/shared/ui';
import type { PublicProfile } from '../api';
import { useProfileSearch } from '../hooks';

/** handle 検索で相手を選ぶ */
export function ProfilePicker({
  onSelect,
  exclude = [],
  autoFocus,
}: {
  onSelect: (p: PublicProfile) => void;
  exclude?: string[];
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState('');
  const results = useProfileSearch(query);
  const list = (results.data ?? []).filter((p) => !exclude.includes(p.id));
  return (
    <div className="flex flex-col gap-3">
      <Input
        label="相手の ID で検索"
        prefix={<AtSign className="h-4 w-4" />}
        placeholder="taro_yamada"
        autoCapitalize="none"
        autoCorrect="off"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() === '' ? (
        <p className="flex items-center gap-1 text-xs text-mist">
          <Search className="h-3.5 w-3.5" /> ID の先頭から一致するユーザーを表示します
        </p>
      ) : results.isPending ? (
        <div className="flex justify-center py-4 text-mist">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="見つかりません" description="ID を確認してください" />
      ) : (
        <Card className="p-0">
          {list.map((p) => (
            <ListRow
              key={p.id}
              icon={<Avatar name={p.display_name} url={p.avatar_url} size="sm" />}
              title={p.display_name}
              subtitle={`@${p.handle}`}
              onClick={() => onSelect(p)}
            />
          ))}
        </Card>
      )}
    </div>
  );
}
