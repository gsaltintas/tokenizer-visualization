import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMultiplicity, searchMultiplicity } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import type { MultiplicityGroup } from '../../types';

function VariantCard({ group }: { group: MultiplicityGroup }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono font-bold text-gray-900">{JSON.stringify(group.base_form)}</h3>
        <span className="text-sm text-gray-500">{group.count} variants</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {group.variants.map((v) => (
          <div
            key={v.token_id}
            className="px-2 py-1 rounded border text-sm font-mono bg-gray-50"
          >
            <span>{JSON.stringify(v.token_str)}</span>
            <div className="flex gap-1 mt-1">
              {v.has_space_prefix && (
                <span className="text-xs px-1 bg-blue-100 text-blue-700 rounded">space</span>
              )}
              <span className={`text-xs px-1 rounded ${
                v.casing === 'upper' ? 'bg-red-100 text-red-700' :
                v.casing === 'title' ? 'bg-yellow-100 text-yellow-700' :
                v.casing === 'mixed' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {v.casing}
              </span>
              {v.has_punctuation && (
                <span className="text-xs px-1 bg-orange-100 text-orange-700 rounded">punct</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">ID: {v.token_id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MultiplicityView() {
  const { activeTokenizerId } = useTokenizer();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data: browseData, isLoading: browseLoading } = useQuery({
    queryKey: ['multiplicity', activeTokenizerId, page],
    queryFn: () => getMultiplicity(activeTokenizerId!, page, 20),
    enabled: !!activeTokenizerId && !searchQuery,
  });

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['multiplicitySearch', activeTokenizerId, searchQuery],
    queryFn: () => searchMultiplicity(activeTokenizerId!, searchQuery),
    enabled: !!activeTokenizerId && searchQuery.length > 0,
  });

  const data = searchQuery ? searchData : browseData;
  const isLoading = searchQuery ? searchLoading : browseLoading;

  if (!activeTokenizerId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Multiplicity Explorer</h2>
        <p className="text-gray-500">Load a tokenizer to explore token variants.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Multiplicity Explorer</h2>
      <p className="text-sm text-gray-600 mb-4">
        Explore groups of tokens that share the same base form but differ in casing, spacing, or punctuation.
      </p>

      <div className="mb-4">
        <input
          className="w-full max-w-md px-3 py-2 border rounded-lg text-sm"
          placeholder="Search by base form (e.g., 'the', 'hello')..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
        />
      </div>

      {data && (
        <p className="text-sm text-gray-500 mb-4">
          {data.total_groups.toLocaleString()} groups found
        </p>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : data ? (
        <div className="space-y-4">
          {data.groups.map((group) => (
            <VariantCard key={group.base_form} group={group} />
          ))}

          {!searchQuery && data.total_groups > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">
                Page {page} of {Math.ceil(data.total_groups / 20)}
              </span>
              <button
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={page >= Math.ceil(data.total_groups / 20)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
