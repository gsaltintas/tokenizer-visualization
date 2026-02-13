import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVocab, getVocabStats } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { PaginatedTable } from '../shared/PaginatedTable';
import type { VocabEntry } from '../../types';

export function VocabView() {
  const { activeTokenizerId } = useTokenizer();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const pageSize = 100;

  const { data: stats } = useQuery({
    queryKey: ['vocabStats', activeTokenizerId],
    queryFn: () => getVocabStats(activeTokenizerId!),
    enabled: !!activeTokenizerId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vocab', activeTokenizerId, page, search, sortBy, sortDir],
    queryFn: () => getVocab(activeTokenizerId!, page, pageSize, search, sortBy, sortDir),
    enabled: !!activeTokenizerId,
  });

  if (!activeTokenizerId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Vocabulary Browser</h2>
        <p className="text-gray-500">Load a tokenizer to browse its vocabulary.</p>
      </div>
    );
  }

  const columns = [
    { key: 'id', header: 'ID', render: (e: VocabEntry) => e.id, sortable: true },
    {
      key: 'token_str',
      header: 'Token',
      render: (e: VocabEntry) => (
        <span className="font-mono px-1 bg-gray-100 rounded">{JSON.stringify(e.token_str)}</span>
      ),
    },
    { key: 'token_bytes_hex', header: 'Hex', render: (e: VocabEntry) => (
      <span className="text-xs text-gray-500 font-mono">{e.token_bytes_hex}</span>
    )},
    { key: 'byte_length', header: 'Bytes', render: (e: VocabEntry) => e.byte_length, sortable: true },
    { key: 'script', header: 'Script', render: (e: VocabEntry) => e.script || '-' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Vocabulary Browser</h2>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Vocab Size</div>
            <div className="text-xl font-bold">{stats.vocab_size.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Avg Token Length</div>
            <div className="text-xl font-bold">{stats.avg_token_length.toFixed(1)} bytes</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Max Token Length</div>
            <div className="text-xl font-bold">{stats.max_token_length} bytes</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Scripts</div>
            <div className="text-xl font-bold">{Object.keys(stats.script_distribution).length}</div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          className="w-full max-w-md px-3 py-2 border rounded-lg text-sm"
          placeholder="Search tokens..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading vocabulary...</p>
      ) : data ? (
        <div className="bg-white rounded-lg border">
          <PaginatedTable
            data={data.entries}
            columns={columns}
            page={data.page}
            pageSize={pageSize}
            total={data.total}
            onPageChange={setPage}
            onSort={(key, dir) => { setSortBy(key); setSortDir(dir); }}
            sortBy={sortBy}
            sortDir={sortDir}
          />
        </div>
      ) : null}
    </div>
  );
}
