import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMorphemes } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { PaginatedTable } from '../shared/PaginatedTable';
import type { MorphemeBreakdown } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TYPE_COLORS: Record<string, string> = {
  morpheme: 'bg-green-100 text-green-800',
  morpheme_composite: 'bg-blue-100 text-blue-800',
  subword: 'bg-yellow-100 text-yellow-800',
  arbitrary: 'bg-gray-100 text-gray-800',
};

export function MorphemeView() {
  const { activeTokenizerId } = useTokenizer();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const pageSize = 100;

  const { data, isLoading } = useQuery({
    queryKey: ['morphemes', activeTokenizerId, page, typeFilter],
    queryFn: () => getMorphemes(activeTokenizerId!, page, pageSize, typeFilter),
    enabled: !!activeTokenizerId,
  });

  if (!activeTokenizerId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Morpheme Analysis</h2>
        <p className="text-gray-500">Load a tokenizer to analyze morphological structure.</p>
      </div>
    );
  }

  const chartData = data
    ? Object.entries(data.type_distribution).map(([type, count]) => ({ type, count }))
    : [];

  const columns = [
    { key: 'token_id', header: 'ID', render: (e: MorphemeBreakdown) => e.token_id, sortable: true },
    {
      key: 'token_str',
      header: 'Token',
      render: (e: MorphemeBreakdown) => (
        <span className="font-mono px-1 bg-gray-100 rounded">{JSON.stringify(e.token_str)}</span>
      ),
    },
    {
      key: 'morpheme_type',
      header: 'Type',
      render: (e: MorphemeBreakdown) => (
        <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[e.morpheme_type] || 'bg-gray-100'}`}>
          {e.morpheme_type}
        </span>
      ),
    },
    {
      key: 'morphemes',
      header: 'Morphemes',
      render: (e: MorphemeBreakdown) => (
        <div className="flex gap-1 flex-wrap">
          {e.morphemes.map((m, i) => (
            <span key={i} className="px-1 bg-blue-50 rounded font-mono text-xs">{m}</span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Morpheme Analysis</h2>

      {data && chartData.length > 0 && (
        <div className="bg-white p-4 rounded-lg border mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Type Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          className={`px-3 py-1 rounded-lg text-sm border ${!typeFilter ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}`}
          onClick={() => { setTypeFilter(''); setPage(1); }}
        >
          All
        </button>
        {['morpheme', 'morpheme_composite', 'subword', 'arbitrary'].map((t) => (
          <button
            key={t}
            className={`px-3 py-1 rounded-lg text-sm border ${typeFilter === t ? 'bg-blue-500 text-white' : 'hover:bg-gray-50'}`}
            onClick={() => { setTypeFilter(t); setPage(1); }}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-500">Analyzing morphemes...</p>
      ) : data ? (
        <div className="bg-white rounded-lg border">
          <PaginatedTable
            data={data.breakdowns}
            columns={columns}
            page={data.page}
            pageSize={pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}
