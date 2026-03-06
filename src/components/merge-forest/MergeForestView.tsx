import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMergeForestTrees } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { ForestSubtreeView } from './ForestSubtreeView';
import type { MergeForestTreeInfo } from '../../types';

type SortField = 'byte_length' | 'rank' | 'depth';

function TreeCard({ tree }: { tree: MergeForestTreeInfo }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="bg-white rounded-lg border">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs select-none">
            {collapsed ? '\u25B6' : '\u25BC'}
          </span>
          <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            {JSON.stringify(tree.root.token)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>rank {tree.root.rank}</span>
          <span>{tree.byte_length} bytes</span>
          <span>depth {tree.depth}</span>
          <span>{tree.node_count} nodes</span>
        </div>
      </div>
      {!collapsed && (
        <div className="px-4 py-3 border-t bg-gray-50/50">
          <ForestSubtreeView node={tree.root} />
        </div>
      )}
    </div>
  );
}

export function MergeForestView() {
  const { activeTokenizerId } = useTokenizer();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('byte_length');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const pageSize = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['mergeForestTrees', activeTokenizerId, page, pageSize, debouncedSearch, sortBy, sortDir],
    queryFn: () =>
      getMergeForestTrees(activeTokenizerId!, page, pageSize, debouncedSearch, sortBy, sortDir),
    enabled: !!activeTokenizerId,
  });

  const handleSortChange = useCallback((field: SortField) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir(field === 'rank' ? 'asc' : 'desc');
      return field;
    });
    setPage(1);
  }, []);

  if (!activeTokenizerId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Merge Forest</h2>
        <p className="text-gray-500">Load a BPE tokenizer to explore its merge forest.</p>
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Merge Forest</h2>
      <p className="text-sm text-gray-600 mb-4">
        Each connected component is a binary tree showing how bytes merge into a final token.
        Click a tree to expand its full decomposition.
      </p>

      {/* Stats */}
      {data && (
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          <span>Trees: <strong>{data.total_roots.toLocaleString()}</strong></span>
          <span>Merges: <strong>{data.total_merges.toLocaleString()}</strong></span>
          <span>Leaves: <strong>{data.total_leaves.toLocaleString()}</strong></span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          className="flex-1 min-w-[200px] max-w-md px-3 py-2 border rounded-lg text-sm"
          placeholder="Search root tokens..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500 text-xs">Sort:</span>
          {(['byte_length', 'depth', 'rank'] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => handleSortChange(field)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                sortBy === field
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {field === 'byte_length' ? 'Size' : field === 'depth' ? 'Depth' : 'Rank'}
              {sortBy === field && (sortDir === 'asc' ? ' \u25B2' : ' \u25BC')}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 mb-4">{(error as Error).message}</p>}

      {isLoading ? (
        <p className="text-gray-500">Loading merge forest...</p>
      ) : data && data.trees.length > 0 ? (
        <>
          <div className="space-y-2">
            {data.trees.map((tree, i) => (
              <TreeCard key={`${tree.root.rank}-${i}`} tree={tree} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : data ? (
        <p className="text-gray-500">No trees match your search.</p>
      ) : null}
    </div>
  );
}
