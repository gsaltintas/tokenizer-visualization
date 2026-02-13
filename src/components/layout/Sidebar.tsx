import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listTokenizers } from '../../api/client';
import { TokenizerSelector } from './TokenizerSelector';
import { useTokenizer } from '../../hooks/useTokenizer';

const NAV_ITEMS = [
  { to: '/', label: 'Tokenize' },
  { to: '/vocab', label: 'Vocabulary' },
  { to: '/multiplicity', label: 'Multiplicity' },
  { to: '/language', label: 'Language' },
  { to: '/morphemes', label: 'Morphemes' },
  { to: '/undertrained', label: 'Under-trained' },
  { to: '/compare', label: 'Comparison' },
];

export function Sidebar() {
  const { comparisonIds, toggleComparison } = useTokenizer();
  const { data: tokenizers = [] } = useQuery({
    queryKey: ['tokenizers'],
    queryFn: listTokenizers,
  });

  const loadedTokenizers = tokenizers.filter((t) => t.vocab_size > 0);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="px-4 py-4 border-b">
        <h1 className="text-lg font-bold text-gray-900">Tokenizer Explorer</h1>
      </div>

      <nav className="px-2 py-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {loadedTokenizers.length > 1 && (
        <div className="px-4 py-3 border-t">
          <p className="text-xs font-medium text-gray-500 mb-2">Compare (select 2+)</p>
          <div className="space-y-1">
            {loadedTokenizers.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={comparisonIds.includes(t.id)}
                  onChange={() => toggleComparison(t.id)}
                  className="rounded border-gray-300"
                />
                <span className="truncate">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="px-4 py-4 border-t overflow-y-auto max-h-[50vh]">
        <TokenizerSelector />
      </div>
    </aside>
  );
}
