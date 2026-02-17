import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { compareMergeTrees } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import type { MergeTreeNode, MergeTreeTokenizerResult } from '../../types';

const SAMPLE_WORDS = ['Ankara', 'tokenization', 'unhappiness', 'JavaScript', 'München'];

function TreeNodeView({ node, depth = 0, isRoot = true }: { node: MergeTreeNode; depth?: number; isRoot?: boolean }) {
  const rankLabel = node.rank >= 0 ? (
    <span className="ml-2 text-xs text-gray-400">rank {node.rank.toLocaleString()}</span>
  ) : null;

  const bgColor = node.is_leaf
    ? 'bg-blue-100 text-blue-800'
    : 'bg-amber-50 text-amber-800 border border-amber-200';

  return (
    <div className={isRoot ? '' : 'ml-6 border-l border-gray-200 pl-3'}>
      <div className="flex items-center py-0.5">
        {!isRoot && <span className="text-gray-300 mr-1">{'─'}</span>}
        <span className={`px-2 py-0.5 rounded font-mono text-sm ${bgColor}`}>
          {node.token}
        </span>
        {rankLabel}
      </div>
      {!node.is_leaf && node.left && node.right && (
        <div>
          <TreeNodeView node={node.left} depth={depth + 1} isRoot={false} />
          <TreeNodeView node={node.right} depth={depth + 1} isRoot={false} />
        </div>
      )}
    </div>
  );
}

function MergeSteps({ result }: { result: MergeTreeTokenizerResult }) {
  return (
    <div className="space-y-1">
      {result.steps.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No merges performed</p>
      ) : (
        result.steps.map((s) => (
          <div key={s.step} className="flex items-start gap-2 text-sm">
            <span className="text-gray-400 w-14 shrink-0">Step {s.step}</span>
            <span className="font-mono bg-green-50 text-green-800 px-1.5 rounded">
              {s.merged_token}
            </span>
            <span className="text-xs text-gray-400 pt-0.5">rank {s.rank.toLocaleString()}</span>
            <span className="text-gray-400 pt-0.5">→</span>
            <div className="flex flex-wrap gap-0.5">
              {s.tokens_after.map((t, i) => (
                <span key={i} className="font-mono px-1.5 py-0.5 bg-gray-100 rounded text-xs">{t}</span>
              ))}
            </div>
          </div>
        ))
      )}
      <div className="flex items-center gap-2 pt-2 border-t mt-2">
        <span className="text-sm font-medium text-gray-700">Final:</span>
        <div className="flex flex-wrap gap-1">
          {result.final_tokens.map((t, i) => (
            <span key={i} className="font-mono px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-sm">
              {t}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-400">({result.final_tokens.length} token{result.final_tokens.length !== 1 ? 's' : ''})</span>
      </div>
    </div>
  );
}

export function MergeTreeView() {
  const { comparisonIds } = useTokenizer();
  const [text, setText] = useState('Ankara');

  const enabled = comparisonIds.length >= 2 && text.length > 0;
  const ids = comparisonIds.slice(0, 2) as [string, string];

  const { data, isLoading, error } = useQuery({
    queryKey: ['mergeTree', ids, text],
    queryFn: () => compareMergeTrees(ids, text),
    enabled,
  });

  if (comparisonIds.length < 2) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Merge Tree Comparison</h2>
        <p className="text-gray-500">
          Load at least 2 tokenizers and select them for comparison in the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Merge Tree Comparison</h2>
      <p className="text-sm text-gray-500 mb-4">
        Compare how two BPE tokenizers build their merge trees for the same input.
      </p>

      <div className="mb-4">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="flex-1 px-4 py-2 border rounded-lg text-sm font-mono"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter a word or short text..."
            maxLength={200}
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {SAMPLE_WORDS.map((w) => (
            <button
              key={w}
              onClick={() => setText(w)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                text === w
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Building merge trees...</p>}
      {error && <p className="text-red-500 text-sm">Error: {(error as Error).message}</p>}

      {data && (
        <div className="space-y-6">
          {/* Initial bytes */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Input bytes (UTF-8)</h3>
            <div className="flex flex-wrap gap-1">
              {data.initial_bytes.map((b, i) => (
                <span key={i} className="font-mono px-2 py-0.5 bg-gray-100 rounded text-sm">{b}</span>
              ))}
            </div>
          </div>

          {/* Side-by-side merge steps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[data.tokenizer_a, data.tokenizer_b].map((result) => (
              <div key={result.name} className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium text-gray-900 mb-3 font-mono">{result.name}</h3>
                <MergeSteps result={result} />
              </div>
            ))}
          </div>

          {/* Side-by-side trees */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[data.tokenizer_a, data.tokenizer_b].map((result) => (
              <div key={result.name} className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium text-gray-900 mb-3">
                  Merge Tree: <span className="font-mono">{result.name}</span>
                </h3>
                <div className="flex gap-4">
                  {result.trees.map((tree, i) => (
                    <TreeNodeView key={i} node={tree} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Conflict analysis */}
          <div className={`p-4 rounded-lg border ${
            data.conflict_analysis.is_compatible
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <h3 className="font-medium mb-3">
              {data.conflict_analysis.is_compatible
                ? 'No intermediate conflicts — trees are compatible'
                : `${data.conflict_analysis.conflict_count} intermediate conflict(s)`}
            </h3>

            {data.conflict_analysis.shared_intermediates.length > 0 && (
              <div className="mb-2">
                <span className="text-sm text-gray-600">Shared intermediates: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.conflict_analysis.shared_intermediates.map((s, i) => (
                    <span key={i} className="font-mono px-2 py-0.5 bg-green-100 text-green-800 rounded text-sm">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {data.conflict_analysis.only_a.length > 0 && (
              <div className="mb-2">
                <span className="text-sm text-gray-600">Only in {data.tokenizer_a.name}: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.conflict_analysis.only_a.map((s, i) => (
                    <span key={i} className="font-mono px-2 py-0.5 bg-red-100 text-red-800 rounded text-sm">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {data.conflict_analysis.only_b.length > 0 && (
              <div className="mb-2">
                <span className="text-sm text-gray-600">Only in {data.tokenizer_b.name}: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.conflict_analysis.only_b.map((s, i) => (
                    <span key={i} className="font-mono px-2 py-0.5 bg-red-100 text-red-800 rounded text-sm">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
