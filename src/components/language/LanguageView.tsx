import { useQuery } from '@tanstack/react-query';
import { getLanguageComposition } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

export function LanguageView() {
  const { activeTokenizerId } = useTokenizer();

  const { data, isLoading } = useQuery({
    queryKey: ['language', activeTokenizerId],
    queryFn: () => getLanguageComposition(activeTokenizerId!),
    enabled: !!activeTokenizerId,
  });

  if (!activeTokenizerId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Language Composition</h2>
        <p className="text-gray-500">Load a tokenizer to analyze script composition.</p>
      </div>
    );
  }

  const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];

  const treemapData = data?.categories
    .filter((c) => c.token_count > 0)
    .map((c, i) => ({
      name: c.script,
      size: c.token_count,
      fill: COLORS[i % COLORS.length],
      percentage: c.percentage,
    })) ?? [];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Language Composition</h2>

      {isLoading ? (
        <p className="text-gray-500">Analyzing vocabulary...</p>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Total Tokens</div>
              <div className="text-xl font-bold">{data.total_tokens.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Scripts Found</div>
              <div className="text-xl font-bold">{data.categories.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-500">Mixed-Script Tokens</div>
              <div className="text-xl font-bold">{data.mixed_script_count.toLocaleString()}</div>
            </div>
          </div>

          {treemapData.length > 0 && (
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Vocabulary by Script</h3>
              <ResponsiveContainer width="100%" height={400}>
                <Treemap
                  data={treemapData}
                  dataKey="size"
                  nameKey="name"
                  stroke="#fff"
                >
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border rounded shadow px-3 py-2 text-sm">
                          <div className="font-bold">{d.name}</div>
                          <div>{d.size.toLocaleString()} tokens ({d.percentage.toFixed(1)}%)</div>
                        </div>
                      );
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Script</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Tokens</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Percentage</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Examples</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((cat) => (
                  <tr key={cat.script} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{cat.script}</td>
                    <td className="px-4 py-2 text-right">{cat.token_count.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{cat.percentage.toFixed(1)}%</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {cat.example_tokens.slice(0, 5).map((t, i) => (
                          <span key={i} className="px-1 bg-gray-100 rounded font-mono text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
