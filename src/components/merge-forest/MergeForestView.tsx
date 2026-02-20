import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMergeForest, getMergeForestSubtree } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { ForestSubtreeView } from './ForestSubtreeView';
import type { MergeForestEntry } from '../../types';

type FilterType = 'all' | 'leaves' | 'merges' | 'roots';

function EntryRow({
  entry,
  tokId,
  onJumpToRank,
}: {
  entry: MergeForestEntry;
  tokId: string;
  onJumpToRank: (rank: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: subtree, isLoading } = useQuery({
    queryKey: ['mergeForestSubtree', tokId, entry.rank],
    queryFn: () => getMergeForestSubtree(tokId, entry.rank),
    enabled: expanded && !entry.is_leaf,
  });

  const displayToken = JSON.stringify(entry.token);

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 ${
          !entry.is_leaf ? 'cursor-pointer' : ''
        } ${expanded ? 'bg-blue-50/30' : ''}`}
        onClick={() => {
          if (!entry.is_leaf) setExpanded(!expanded);
        }}
      >
        <td className="px-2 py-1.5 text-gray-500 font-mono text-xs">{entry.rank}</td>
        <td className="px-2 py-1.5 font-mono text-sm">
          <span
            className={`inline-block px-1 rounded ${
              entry.is_leaf
                ? 'bg-blue-50 text-blue-800'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {displayToken}
          </span>
        </td>
        <td className="px-2 py-1.5 text-xs text-gray-400 font-mono">{entry.token_hex}</td>
        <td className="px-2 py-1.5 text-xs text-center">{entry.byte_length}</td>
        <td className="px-2 py-1.5 text-xs font-mono">
          {entry.left !== null && entry.right !== null ? (
            <span>
              <span className="text-blue-600">{JSON.stringify(entry.left)}</span>
              <span className="text-gray-400 mx-1">+</span>
              <span className="text-blue-600">{JSON.stringify(entry.right)}</span>
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>
        <td className="px-2 py-1.5 text-center">
          {entry.is_root && !entry.is_leaf && (
            <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
              root
            </span>
          )}
          {entry.is_leaf && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
              leaf
            </span>
          )}
        </td>
      </tr>
      {expanded && !entry.is_leaf && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-gray-50/50 border-b">
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading subtree...</p>
            ) : subtree ? (
              <div>
                <div className="flex gap-3 text-xs text-gray-500 mb-2">
                  <span>Depth: {subtree.depth}</span>
                  <span>Nodes: {subtree.node_count}</span>
                </div>
                <ForestSubtreeView node={subtree.root} onJumpToRank={onJumpToRank} />
              </div>
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}

export function MergeForestView() {
  const { activeTokenizerId } = useTokenizer();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const pageSize = 100;

  // Debounce search
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (searchTimer) clearTimeout(searchTimer);
      const timer = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, 300);
      setSearchTimer(timer);
    },
    [searchTimer],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ['mergeForest', activeTokenizerId, page, pageSize, debouncedSearch, sortBy, sortDir, filter],
    queryFn: () =>
      getMergeForest(activeTokenizerId!, page, pageSize, debouncedSearch, sortBy, sortDir, filter),
    enabled: !!activeTokenizerId,
  });

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortIndicator = (col: string) => {
    if (sortBy !== col) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const handleJumpToRank = useCallback(
    (rank: number) => {
      // Set search to the hex or clear and jump to the page containing this rank
      // For simplicity, search by rank as a number — not directly supported,
      // so we clear filters and navigate to the right page
      setSearch('');
      setDebouncedSearch('');
      setFilter('all');
      setSortBy('rank');
      setSortDir('asc');
      // Estimate the page: rank-based sorted, page = ceil(rank / pageSize)
      // This is approximate since leaf bytes (0-255) are included
      const estimatedPage = Math.max(1, Math.ceil((rank + 1) / pageSize));
      setPage(estimatedPage);
    },
    [pageSize],
  );

  if (!activeTokenizerId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Merge Forest</h2>
        <p className="text-gray-500">Load a BPE tokenizer to explore its merge forest.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Merge Forest</h2>
      <p className="text-sm text-gray-600 mb-4">
        Explore the full BPE merge table as a forest of binary trees. Click any merge row to expand its decomposition tree.
      </p>

      {/* Stats bar */}
      {data && (
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          <span>
            Total: <strong>{data.total.toLocaleString()}</strong>
          </span>
          <span>
            Leaves: <strong>{data.total_leaves.toLocaleString()}</strong>
          </span>
          <span>
            Merges: <strong>{data.total_merges.toLocaleString()}</strong>
          </span>
          <span>
            Roots: <strong>{data.total_roots.toLocaleString()}</strong>
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          className="flex-1 min-w-[200px] max-w-md px-3 py-2 border rounded-lg text-sm"
          placeholder="Search tokens..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          className="px-3 py-2 border rounded-lg text-sm bg-white"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as FilterType);
            setPage(1);
          }}
        >
          <option value="all">All</option>
          <option value="leaves">Leaves</option>
          <option value="merges">Merges</option>
          <option value="roots">Roots</option>
        </select>
      </div>

      {error && <p className="text-red-500 mb-4">{(error as Error).message}</p>}

      {isLoading ? (
        <p className="text-gray-500">Loading merge forest...</p>
      ) : data && data.entries.length > 0 ? (
        <>
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50">
                  <th
                    className="px-2 py-2 cursor-pointer hover:text-gray-900 font-medium"
                    onClick={() => handleSort('rank')}
                  >
                    Rank{sortIndicator('rank')}
                  </th>
                  <th
                    className="px-2 py-2 cursor-pointer hover:text-gray-900 font-medium"
                    onClick={() => handleSort('token')}
                  >
                    Token{sortIndicator('token')}
                  </th>
                  <th className="px-2 py-2 font-medium">Hex</th>
                  <th
                    className="px-2 py-2 cursor-pointer hover:text-gray-900 font-medium text-center"
                    onClick={() => handleSort('byte_length')}
                  >
                    Bytes{sortIndicator('byte_length')}
                  </th>
                  <th className="px-2 py-2 font-medium">Merge</th>
                  <th className="px-2 py-2 font-medium text-center">Type</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <EntryRow
                    key={entry.rank}
                    entry={entry}
                    tokId={activeTokenizerId}
                    onJumpToRank={handleJumpToRank}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-4">
            <button
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">
              Page {page} of {Math.ceil(data.total / pageSize)}
            </span>
            <button
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={page >= Math.ceil(data.total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : data ? (
        <p className="text-gray-500">No tokens match your search.</p>
      ) : null}
    </div>
  );
}
