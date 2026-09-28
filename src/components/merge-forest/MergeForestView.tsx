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
          <span title="Position in the merge order (lower = merged earlier)">rank {tree.root.rank}</span>
          <span title="Length of the root token in bytes">{tree.byte_length} bytes</span>
          <span title="Levels from the root down to the deepest leaf">depth {tree.depth}</span>
          <span title="Total nodes in the expanded tree, including leaves">{tree.node_count} nodes</span>
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
      <p className="text-sm text-gray-600 mb-2">
        Each connected component is a binary tree showing how bytes merge into a final token.
        Click a tree to expand its full decomposition.
      </p>

      <details className="mb-4 text-sm text-gray-600 bg-white border rounded-lg">
        <summary className="px-4 py-2 cursor-pointer select-none font-medium text-gray-700">
          How to read this
        </summary>
        <div className="px-4 pb-3 space-y-2">
          <p>
            <strong>Rank</strong> is the token's position in the tokenizer's merge order: rank 0 is
            learned first, and a lower rank means the merge is applied earlier when encoding. For
            tiktoken encodings this is the true merge rank. For Hugging Face tokenizers it is
            currently the vocabulary ID, which can be far from merge order: hand-added tokens (such
            as runs of spaces or newlines) may have low IDs, and base characters high ones.
          </p>
          <p>
            <span className="inline-block px-1.5 rounded font-mono border bg-amber-50 text-amber-800 border-amber-200">amber</span>{' '}
            nodes are merged tokens.{' '}
            <span className="inline-block px-1.5 rounded font-mono border bg-blue-50 text-blue-800 border-blue-200">blue</span>{' '}
            nodes are leaves: base tokens that are not built from a merge. Under each merged token,
            the first child is the left part (prefix) and the second is the right part (suffix).
          </p>
          <p>
            A token's parts are chosen as the split whose worse part (the higher rank of the two)
            is lowest, which reconstructs the merge BPE most likely used. The same part can appear
            more than once, e.g. <code className="font-mono">"\n\n\n\n"</code> ={' '}
            <code className="font-mono">"\n\n"</code> + <code className="font-mono">"\n\n"</code>,
            and each copy is expanded.
          </p>
          <p>
            <strong>Size</strong> is the root token's length in bytes, <strong>depth</strong> is the
            number of levels from the root down to the deepest leaf (a lone leaf has depth 1), and <strong>nodes</strong> counts
            every node in the expanded tree. The <code className="font-mono">0x…</code> value is the
            token's raw bytes in hex.
          </p>
        </div>
      </details>

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
