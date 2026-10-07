import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import { compareFlores, compareIntrinsic, getFloresLanguages } from '../../api/client';
import type { ComparisonFloresResponse, PerTextMetrics } from '../../types';

// Categorical slots in fixed order: a tokenizer keeps its color as long as it stays
// selected (assigned by position in the comparison list, never re-cycled per chart).
// Slots 1-3 also separate under color-vision deficiency; beyond that the legend and the
// table identify series.
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

type Better = 'lower' | 'higher' | null;

const PER_TEXT_ROWS: { key: keyof PerTextMetrics; label: string; help: string; better: Better; pct?: boolean; count?: boolean }[] = [
  { key: 'n_tokens', label: 'Tokens', help: 'Number of tokens for the text', better: 'lower', count: true },
  { key: 'fertility_words', label: 'Fertility', help: 'Tokens per whitespace-separated word', better: 'lower' },
  { key: 'bytes_per_token', label: 'Bytes / token', help: 'UTF-8 bytes covered per token (compression)', better: 'higher' },
  { key: 'chars_per_token', label: 'Chars / token', help: 'Characters covered per token', better: 'higher' },
  { key: 'tokens_per_byte', label: 'Tokens / byte', help: 'Inverse compression', better: 'lower' },
  { key: 'integrity_rate', label: 'UTF-8 integrity', help: 'Share of tokens that are complete, valid UTF-8', better: 'higher', pct: true },
  { key: 'boundary_crossing_rate', label: 'Char-boundary crossing', help: 'Share of tokens that span a character boundary mid-character', better: 'lower', pct: true },
  { key: 'byte_fallback_rate', label: 'Byte fallback', help: 'Share of <0xAB>-style byte tokens', better: 'lower', pct: true },
];

function fmt(v: number | null | undefined, pct = false, decimals = 3): string {
  if (v == null) return '—';
  return pct ? `${(v * 100).toFixed(1)}%` : v.toFixed(decimals);
}

function bestIndex(values: (number | null | undefined)[], better: Better): number | null {
  if (!better) return null;
  const valid = values.map((v, i) => [v, i] as const).filter(([v]) => v != null) as [number, number][];
  if (valid.length < 2 || valid.every(([v]) => v === valid[0][0])) return null;
  return valid.reduce((a, b) => ((better === 'lower' ? b[0] < a[0] : b[0] > a[0]) ? b : a))[1];
}

function SeriesKey({ index }: { index: number }) {
  return (
    <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle" style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }} />
  );
}

function PerTextTable({ tokenizerIds, text }: { tokenizerIds: string[]; text: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['compareIntrinsic', tokenizerIds, text],
    queryFn: () => compareIntrinsic(tokenizerIds, text),
    enabled: text.trim().length > 0,
  });

  return (
    <section className="space-y-2">
      <h3 className="font-medium">On this text</h3>
      <p className="text-xs text-gray-500">
        Per-text metrics from{' '}
        <a href="https://github.com/cimeister/tokenizer-intrinsic-evals" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          TokEval
        </a>
        . The best value in each row is marked ▲ (hover a metric for its definition).
      </p>
      {isLoading && <p className="text-gray-500 text-sm">Computing metrics...</p>}
      {error && <p className="text-red-500 text-sm">{(error as Error).message}</p>}
      {data && (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Metric</th>
                {data.results.map((r) => (
                  <th key={r.tokenizer_id} className="px-3 py-2 text-right font-mono font-normal">
                    {r.tokenizer_id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PER_TEXT_ROWS.map((row) => {
                const values = data.results.map((r) => r.metrics[row.key]);
                const best = bestIndex(values, row.better);
                return (
                  <tr key={row.key} className="border-b last:border-0">
                    <td className="px-3 py-1.5" title={row.help}>
                      {row.label}
                      {row.better && <span className="ml-1 text-xs text-gray-400">({row.better} is better)</span>}
                    </td>
                    {values.map((v, i) => (
                      <td key={i} className={`px-3 py-1.5 text-right tabular-nums ${i === best ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {row.count ? (v ?? '—') : fmt(v, row.pct)}
                        {i === best && <span className="ml-1 text-xs text-blue-600">▲</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FloresCompare({ tokenizerIds }: { tokenizerIds: string[] }) {
  const { data: langs = [] } = useQuery({ queryKey: ['flores-languages'], queryFn: getFloresLanguages });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nSamples, setNSamples] = useState(100);
  const [result, setResult] = useState<ComparisonFloresResponse | null>(null);

  const mutation = useMutation({
    mutationFn: ({ codes, n }: { codes: string[]; n: number }) => compareFlores(tokenizerIds, codes, n),
    onSuccess: setResult,
  });

  const codes = selected.size > 0 ? [...selected] : langs.map((l) => l.code);
  const nameOf = (code: string) => langs.find((l) => l.code === code)?.name ?? code;
  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  // Results may be for an older selection; only chart tokenizers still being compared
  const shown = result?.results.filter((r) => tokenizerIds.includes(r.tokenizer_id)) ?? [];
  const langCodes = shown[0]?.per_language.map((l) => l.code) ?? [];
  const chartData = langCodes.map((code) => {
    const row: Record<string, string | number | null> = { language: nameOf(code) };
    for (const r of shown) row[r.tokenizer_id] = r.per_language.find((l) => l.code === code)?.tokens_per_byte ?? null;
    return row;
  });
  const errors = shown.flatMap((r) => r.per_language.filter((l) => l.error).map((l) => `${l.code}: ${l.error}`));
  const colorOf = (id: string) => SERIES_COLORS[tokenizerIds.indexOf(id) % SERIES_COLORS.length];
  const bestGini = bestIndex(shown.map((r) => r.gini), 'lower');

  return (
    <section className="space-y-3">
      <h3 className="font-medium">Across languages (FLORES+)</h3>
      <p className="text-xs text-gray-500">
        Every tokenizer encodes the same{' '}
        <a href="https://huggingface.co/datasets/openlanguagedata/flores_plus" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          FLORES+
        </a>{' '}
        sentences (translations of one another), so tokens per byte compare directly across languages. The Gini
        coefficient of tokens per byte across languages measures how unevenly a tokenizer treats them (lower is fairer).
      </p>

      <div className="flex flex-wrap gap-1.5">
        {langs.map((l) => (
          <button
            key={l.code}
            onClick={() => toggle(l.code)}
            title={`${l.code} · ${l.script}`}
            className={`text-xs px-2 py-1 rounded border ${
              selected.has(l.code)
                ? 'bg-blue-100 border-blue-400 text-blue-800'
                : selected.size === 0
                ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
            }`}
          >
            {l.name}
          </button>
        ))}
        {selected.size > 0 && (
          <button className="text-xs text-blue-600 hover:underline ml-1" onClick={() => setSelected(new Set())}>
            all languages
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Sentences per language</label>
        <input
          type="number"
          min={10}
          max={1012}
          value={nSamples}
          onChange={(e) => setNSamples(Number(e.target.value))}
          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
        />
        <button
          onClick={() => mutation.mutate({ codes, n: nSamples })}
          disabled={mutation.isPending || codes.length === 0}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending
            ? `Evaluating ${tokenizerIds.length} tokenizers…`
            : `Run on ${codes.length} language${codes.length !== 1 ? 's' : ''}`}
        </button>
      </div>
      {mutation.isPending && <p className="text-sm text-gray-500 animate-pulse">Loading FLORES+ and tokenizing; the first run can take a minute.</p>}
      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}

      {shown.length > 0 && !mutation.isPending && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {shown.map((r, i) => (
              <div key={r.tokenizer_id} className="bg-white border rounded-lg p-3">
                <div className="text-xs text-gray-500 font-mono truncate" title={r.tokenizer_id}>
                  <SeriesKey index={tokenizerIds.indexOf(r.tokenizer_id)} />
                  {r.tokenizer_id}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {fmt(r.gini, false, 4)}
                  {i === bestGini && <span className="ml-1 text-xs text-blue-600">▲ fairest</span>}
                </div>
                <div className="text-xs text-gray-400">Gini over {r.n_languages} languages</div>
              </div>
            ))}
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <h4 className="text-sm font-medium mb-1">Tokens per byte, by language</h4>
            <p className="text-xs text-gray-500 mb-3">Lower means better compression for that language.</p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
                <CartesianGrid vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="language" tick={{ fontSize: 11, fill: '#52514e' }} interval={0} angle={-35} textAnchor="end" height={60} tickLine={false} axisLine={{ stroke: '#d1d5db' }} />
                <YAxis tick={{ fontSize: 11, fill: '#52514e' }} tickLine={false} axisLine={false} width={44} />
                <Tooltip
                  cursor={{ fill: '#f3f4f6' }}
                  formatter={(v) => (typeof v === 'number' ? v.toFixed(3) : String(v))}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} itemSorter={null} />
                {shown.map((r) => (
                  <Bar key={r.tokenizer_id} dataKey={r.tokenizer_id} fill={colorOf(r.tokenizer_id)} radius={[4, 4, 0, 0]} maxBarSize={18} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Language</th>
                  {shown.map((r) => (
                    <th key={r.tokenizer_id} className="px-3 py-2 text-right font-normal font-mono" colSpan={2}>
                      <SeriesKey index={tokenizerIds.indexOf(r.tokenizer_id)} />
                      {r.tokenizer_id}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th />
                  {shown.map((r) => (
                    <FragmentHeads key={r.tokenizer_id} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {langCodes.map((code) => {
                  const rows = shown.map((r) => r.per_language.find((l) => l.code === code));
                  const best = bestIndex(rows.map((l) => l?.tokens_per_byte), 'lower');
                  return (
                    <tr key={code} className="border-b last:border-0">
                      <td className="px-3 py-1.5">
                        {nameOf(code)} <span className="text-xs text-gray-400">{code}</span>
                      </td>
                      {rows.map((l, i) => (
                        <FragmentCells key={i} fertility={l?.fertility} tpb={l?.tokens_per_byte} best={i === best} />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {errors.length > 0 && <p className="text-xs text-red-600">{errors.slice(0, 3).join(' · ')}</p>}
        </div>
      )}
    </section>
  );
}

function FragmentHeads() {
  return (
    <>
      <th className="px-3 py-1 text-right font-normal text-gray-400">fertility</th>
      <th className="px-3 py-1 text-right font-normal text-gray-400">tok/byte</th>
    </>
  );
}

function FragmentCells({ fertility, tpb, best }: { fertility?: number | null; tpb?: number | null; best: boolean }) {
  return (
    <>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-700">{fmt(fertility)}</td>
      <td className={`px-3 py-1.5 text-right tabular-nums ${best ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {fmt(tpb)}
        {best && <span className="ml-1 text-xs text-blue-600">▲</span>}
      </td>
    </>
  );
}

export function IntrinsicCompare({ tokenizerIds, text }: { tokenizerIds: string[]; text: string }) {
  return (
    <div className="space-y-8">
      <PerTextTable tokenizerIds={tokenizerIds} text={text} />
      <FloresCompare tokenizerIds={tokenizerIds} />
    </div>
  );
}
