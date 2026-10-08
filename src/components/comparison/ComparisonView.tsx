import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOverlap, compareTokenize, compareEfficiency } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { TokenChips } from '../shared/TokenChip';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PretokenizeCompare } from './PretokenizeCompare';
import { IntrinsicCompare } from './IntrinsicCompare';

type Tab = 'overlap' | 'tokenize' | 'pretokenize' | 'intrinsic' | 'efficiency';

const TAB_LABELS: Record<Tab, string> = {
  overlap: 'Vocabulary Overlap',
  tokenize: 'Side-by-Side',
  pretokenize: 'Pre-tokenization',
  intrinsic: 'Intrinsic Metrics',
  efficiency: 'Efficiency',
};

// Tabs that work on the shared input text
const TEXT_TABS: Tab[] = ['tokenize', 'pretokenize', 'intrinsic'];

export function ComparisonView() {
  const { comparisonIds } = useTokenizer();
  const [tab, setTab] = useState<Tab>('overlap');
  const [compareText, setCompareText] = useState("Héllo world! It's 2026 — 東京 🎉 don't stop.");
  const [debouncedText, setDebouncedText] = useState(compareText);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(compareText), 300);
    return () => clearTimeout(t);
  }, [compareText]);

  const { data: overlapData, isLoading: overlapLoading } = useQuery({
    queryKey: ['overlap', comparisonIds],
    queryFn: () => getOverlap(comparisonIds),
    enabled: comparisonIds.length >= 2 && tab === 'overlap',
  });

  const { data: tokenizeData, isLoading: tokenizeLoading } = useQuery({
    queryKey: ['compareTokenize', comparisonIds, debouncedText],
    queryFn: () => compareTokenize(comparisonIds, debouncedText),
    enabled: comparisonIds.length >= 2 && tab === 'tokenize' && debouncedText.length > 0,
  });

  const { data: efficiencyData, isLoading: efficiencyLoading } = useQuery({
    queryKey: ['efficiency', comparisonIds],
    queryFn: () => compareEfficiency(comparisonIds),
    enabled: comparisonIds.length >= 2 && tab === 'efficiency',
  });

  if (comparisonIds.length < 2) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Comparison</h2>
        <p className="text-gray-500">
          Load at least 2 tokenizers and select them for comparison in the sidebar.
          Toggle comparison tokenizers by clicking the compare button next to loaded tokenizers.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Comparison</h2>
      <p className="text-sm text-gray-500 mb-4">
        Comparing: {comparisonIds.join(', ')}
      </p>

      <div className="flex gap-2 mb-6 border-b pb-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm rounded-t-lg ${tab === t ? 'bg-white border border-b-white -mb-px font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {TEXT_TABS.includes(tab) && (
        <textarea
          className="w-full h-24 px-4 py-3 mb-4 border rounded-lg text-sm font-mono resize-y"
          value={compareText}
          onChange={(e) => setCompareText(e.target.value)}
          placeholder="Enter text to compare..."
        />
      )}

      {tab === 'overlap' && (
        <div>
          {overlapLoading ? (
            <p className="text-gray-500">Computing overlap...</p>
          ) : overlapData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Shared Tokens</div>
                  <div className="text-xl font-bold">{overlapData.shared_tokens.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Total Union</div>
                  <div className="text-xl font-bold">{overlapData.total_union.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-500">Overlap</div>
                  <div className="text-xl font-bold">{overlapData.overlap_percentage.toFixed(1)}%</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium mb-2">Unique tokens per tokenizer</h3>
                {Object.entries(overlapData.unique_per_tokenizer).map(([id, count]) => (
                  <div key={id} className="flex justify-between py-1 border-b last:border-0">
                    <span className="font-mono text-sm">{id}</span>
                    <span>{count.toLocaleString()} unique</span>
                  </div>
                ))}
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium mb-2">Sample shared tokens</h3>
                <div className="flex flex-wrap gap-1">
                  {overlapData.shared_sample.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 bg-green-50 rounded font-mono text-sm">{t}</span>
                  ))}
                </div>
              </div>

              {Object.entries(overlapData.unique_samples).map(([id, samples]) => (
                <div key={id} className="bg-white p-4 rounded-lg border">
                  <h3 className="font-medium mb-2">Unique to {id}</h3>
                  <div className="flex flex-wrap gap-1">
                    {samples.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-50 rounded font-mono text-sm">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {tab === 'tokenize' && (
        <div className="space-y-4">
          {tokenizeLoading ? (
            <p className="text-gray-500">Tokenizing...</p>
          ) : tokenizeData ? (
            <div className="space-y-4">
              {tokenizeData.results.map((result) => (
                <div key={result.tokenizer_id} className="bg-white p-4 rounded-lg border">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium font-mono">{result.tokenizer_id}</h3>
                    <span className="text-sm text-gray-500">{result.token_count} tokens</span>
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    <TokenChips tokens={result.tokens} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {tab === 'pretokenize' && <PretokenizeCompare tokenizerIds={comparisonIds} text={debouncedText} />}

      {tab === 'intrinsic' && <IntrinsicCompare tokenizerIds={comparisonIds} text={debouncedText} />}

      {tab === 'efficiency' && (
        <div>
          {efficiencyLoading ? (
            <p className="text-gray-500">Computing efficiency metrics...</p>
          ) : efficiencyData ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="font-medium mb-3">Tokens per Word</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={efficiencyData.metrics}>
                    <XAxis dataKey="tokenizer_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avg_tokens_per_word" fill="#3b82f6" name="Tokens/Word" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Tokenizer</th>
                      <th className="px-4 py-2 text-right">Avg Tokens/Word</th>
                      <th className="px-4 py-2 text-right">Avg Token Length</th>
                      <th className="px-4 py-2 text-right">Total Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {efficiencyData.metrics.map((m) => (
                      <tr key={m.tokenizer_id} className="border-b">
                        <td className="px-4 py-2 font-mono">{m.tokenizer_id}</td>
                        <td className="px-4 py-2 text-right">{m.avg_tokens_per_word.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{m.avg_token_length_chars.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right">{m.total_tokens}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
