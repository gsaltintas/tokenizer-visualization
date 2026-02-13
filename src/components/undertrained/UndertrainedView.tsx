import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUndertrained } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { PaginatedTable } from '../shared/PaginatedTable';
import type { UndertrainedToken } from '../../types';

export function UndertrainedView() {
  const { activeTokenizerId } = useTokenizer();
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const { data, isLoading } = useQuery({
    queryKey: ['undertrained', activeTokenizerId, page],
    queryFn: () => getUndertrained(activeTokenizerId!, page, pageSize),
    enabled: !!activeTokenizerId,
  });

  if (!activeTokenizerId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Under-trained Tokens</h2>
        <p className="text-gray-500">Load a tokenizer to detect under-trained tokens.</p>
      </div>
    );
  }

  if (data && !data.bpe_available) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Under-trained Tokens</h2>
        <p className="text-gray-500">
          Under-trained token detection is only available for BPE tokenizers.
          The current tokenizer does not use BPE.
        </p>
      </div>
    );
  }

  const columns = [
    { key: 'token_id', header: 'ID', render: (t: UndertrainedToken) => t.token_id },
    {
      key: 'token_str',
      header: 'Token',
      render: (t: UndertrainedToken) => (
        <span className="font-mono px-1 bg-gray-100 rounded">{JSON.stringify(t.token_str)}</span>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      render: (t: UndertrainedToken) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${t.confidence > 0.8 ? 'bg-red-500' : t.confidence > 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${t.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs">{(t.confidence * 100).toFixed(0)}%</span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (t: UndertrainedToken) => (
        <span className="text-sm">{t.reason}</span>
      ),
    },
    {
      key: 'expected',
      header: 'Expected Path',
      render: (t: UndertrainedToken) => (
        <div className="flex gap-1 flex-wrap">
          {t.expected_merge_path.map((s, i) => (
            <span key={i} className="px-1 bg-green-50 rounded font-mono text-xs">{s}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'actual',
      header: 'Actual Result',
      render: (t: UndertrainedToken) => (
        <div className="flex gap-1 flex-wrap">
          {t.actual_merge_result.map((s, i) => (
            <span key={i} className="px-1 bg-red-50 rounded font-mono text-xs">{s}</span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Under-trained Tokens</h2>
      <p className="text-sm text-gray-600 mb-4">
        Tokens that may be under-trained, detected via BPE merge reachability analysis.
        These tokens exist in the vocabulary but are unreachable through normal BPE merging.
      </p>

      {isLoading ? (
        <p className="text-gray-500">Analyzing BPE merges (this may take a moment)...</p>
      ) : data ? (
        <>
          <div className="bg-white p-4 rounded-lg border mb-4">
            <span className="text-sm text-gray-600">
              Found <strong>{data.total}</strong> potentially under-trained tokens
            </span>
          </div>
          <div className="bg-white rounded-lg border">
            <PaginatedTable
              data={data.tokens}
              columns={columns}
              page={data.page}
              pageSize={pageSize}
              total={data.total}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
