import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { comparePretokenize } from '../../api/client';
import { useTokenColors } from '../../tokenColors';
import type { TokenizerPretokenization } from '../../types';

type Mode = 'chunks' | 'tokens';

// Aligned view gets too wide to scan past this many characters
const MAX_GRID_CHARS = 400;

function visible(s: string) {
  return s.replace(/ /g, '·').replace(/\n/g, '↵').replace(/\t/g, '→');
}

function spansFor(r: TokenizerPretokenization, mode: Mode): [number, number][] {
  return mode === 'chunks' ? r.chunks.map((c) => [c.start, c.end]) : r.token_spans;
}

function boundariesFor(r: TokenizerPretokenization, mode: Mode): number[] {
  return mode === 'chunks' ? r.chunk_boundaries : r.token_boundaries;
}

/**
 * One row per tokenizer, one column per piece of text between any two boundaries of any
 * tokenizer, so the same character lines up in every row.  Cells of the same chunk/token
 * share a color; a boundary is drawn as a bar on the cell's left edge, gray when every
 * tokenizer splits there and red when only some do.
 */
function AlignmentGrid({ text, results, mode }: { text: string; results: TokenizerPretokenization[]; mode: Mode }) {
  const { chunkStyle, tokenStyle } = useTokenColors();
  const style = mode === 'chunks' ? chunkStyle : tokenStyle;
  // Offsets from the backend count code points (Python str indices), not UTF-16 units
  const chars = useMemo(() => Array.from(text), [text]);

  const { cuts, rowBounds, shared } = useMemo(() => {
    const rowBounds = results.map((r) => new Set(boundariesFor(r, mode)));
    const all = new Set<number>([0, chars.length]);
    // Span edges too, so text a tokenizer drops (e.g. BERT's whitespace) gets its own column
    results.forEach((r) => spansFor(r, mode).forEach(([s, e]) => { all.add(s); all.add(e); }));
    rowBounds.forEach((b) => b.forEach((x) => all.add(x)));
    const cuts = [...all].filter((x) => x >= 0 && x <= chars.length).sort((a, b) => a - b);
    const shared = new Set(cuts.filter((c) => rowBounds.every((b) => b.has(c))));
    return { cuts, rowBounds, shared };
  }, [chars, results, mode]);

  // For each row, the index of the chunk/token covering each column (-1: not covered)
  const owners = useMemo(
    () =>
      results.map((r) => {
        const spans = spansFor(r, mode);
        return cuts.slice(0, -1).map((a) => spans.findIndex(([s, e]) => s <= a && a < e));
      }),
    [results, mode, cuts],
  );

  return (
    <div className="overflow-x-auto border rounded-lg bg-white">
      <table className="border-separate" style={{ borderSpacing: 0 }}>
        <tbody>
          {results.map((r, ri) => (
            <tr key={r.tokenizer_id}>
              <th className="sticky left-0 z-10 bg-white px-3 py-1.5 text-left text-xs font-mono font-medium text-gray-700 whitespace-nowrap border-r">
                {r.tokenizer_id}
                {mode === 'chunks' && r.offsets_approximate && (
                  <span
                    className="ml-1 text-amber-600"
                    title="Normalization changes the text, so chunk positions are estimated"
                  >
                    ≈
                  </span>
                )}
              </th>
              {cuts.slice(0, -1).map((a, ci) => {
                const owner = owners[ri][ci];
                const isBoundary = a > 0 && rowBounds[ri].has(a);
                const { backgroundColor, color } = owner >= 0 ? style(owner) : {};
                return (
                  <td
                    key={a}
                    className={`py-1 font-mono text-sm whitespace-pre ${owner < 0 ? 'text-gray-300' : ''}`}
                    style={{
                      backgroundColor,
                      color,
                      borderLeft: isBoundary ? `2px solid ${shared.has(a) ? '#9ca3af' : '#dc2626'}` : '2px solid transparent',
                      paddingLeft: 1,
                      paddingRight: 1,
                    }}
                    title={owner < 0 ? 'Not part of any chunk (dropped by the pre-tokenizer)' : undefined}
                  >
                    {visible(chars.slice(a, cuts[ci + 1]).join(''))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Single-hue sequential scale (light → dark blue) for agreement in [0, 1]
function agreementStyle(v: number) {
  const steps = ['#eef4fc', '#d4e4f8', '#b2cff2', '#86b2e8', '#5a94dd', '#2a78d6', '#1d5aa3'];
  const i = Math.min(steps.length - 1, Math.floor(v * steps.length));
  return { backgroundColor: steps[i], color: i >= 4 ? '#ffffff' : '#0b0b0b' };
}

function AgreementMatrix({ title, ids, matrix, help }: { title: string; ids: string[]; matrix: number[][]; help: string }) {
  return (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-3">{help}</p>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th />
              {ids.map((id, j) => (
                <th key={id} className="px-2 py-1 font-mono font-normal text-gray-500" title={id}>
                  {j + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((id, i) => (
              <tr key={id}>
                <th className="pr-2 py-1 text-left font-mono font-normal text-gray-600 whitespace-nowrap">
                  {i + 1}. {id}
                </th>
                {matrix[i].map((v, j) => (
                  <td
                    key={j}
                    className="w-14 h-8 text-center tabular-nums border border-white"
                    style={agreementStyle(v)}
                    title={`${ids[i]} vs ${ids[j]}: ${(v * 100).toFixed(1)}% of boundaries match (F1)`}
                  >
                    {(v * 100).toFixed(0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryTable({ results }: { results: TokenizerPretokenization[] }) {
  const [openRegex, setOpenRegex] = useState<string | null>(null);
  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b text-xs text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Tokenizer</th>
            <th className="px-3 py-2 text-left font-medium">Normalization</th>
            <th className="px-3 py-2 text-left font-medium">Pre-tokenizer</th>
            <th className="px-3 py-2 text-right font-medium">Chunks</th>
            <th className="px-3 py-2 text-right font-medium">Tokens</th>
            <th className="px-3 py-2 text-right font-medium">Tokens / chunk</th>
            <th
              className="px-3 py-2 text-right font-medium"
              title="Tokens that span a chunk boundary, i.e. the model merges across pre-tokens"
            >
              Cross-chunk tokens
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.tokenizer_id} className="border-b last:border-0 align-top">
              <td className="px-3 py-2 font-mono text-xs">{r.tokenizer_id}</td>
              <td className="px-3 py-2 text-xs">
                <span>{r.normalization_type}</span>
                {r.normalization_changed ? (
                  <div className="mt-1 font-mono text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 break-all">
                    {r.normalized_text}
                  </div>
                ) : (
                  <span className="ml-2 text-gray-400">(no change)</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs">
                <div className="font-medium">{r.pretokenizer_type}</div>
                <div className="text-gray-500">{r.pretokenizer_description}</div>
                {r.regex_pattern && (
                  <button
                    className="text-blue-600 hover:underline mt-1"
                    onClick={() => setOpenRegex(openRegex === r.tokenizer_id ? null : r.tokenizer_id)}
                  >
                    {openRegex === r.tokenizer_id ? 'Hide' : 'Show'} regex
                  </button>
                )}
                {openRegex === r.tokenizer_id && r.regex_pattern && (
                  <pre className="mt-1 p-2 bg-gray-900 text-green-300 rounded whitespace-pre-wrap break-all max-w-md">
                    {r.regex_pattern}
                  </pre>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{r.chunks.length}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.tokens.length}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.tokens_per_chunk.toFixed(2)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.chunk_crossing_tokens}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PretokenizeCompare({ tokenizerIds, text }: { tokenizerIds: string[]; text: string }) {
  const [mode, setMode] = useState<Mode>('chunks');
  const { data, isLoading, error } = useQuery({
    queryKey: ['comparePretokenize', tokenizerIds, text],
    queryFn: () => comparePretokenize(tokenizerIds, text),
    enabled: text.length > 0,
  });

  if (isLoading) return <p className="text-gray-500">Pre-tokenizing...</p>;
  if (error) return <p className="text-red-500 text-sm">{(error as Error).message}</p>;
  if (!data) return null;

  const ids = data.results.map((r) => r.tokenizer_id);
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-medium text-sm">Where each tokenizer splits the text</h3>
          <div className="flex rounded-lg border overflow-hidden text-xs">
            {(['chunks', 'tokens'] as Mode[]).map((m) => (
              <button
                key={m}
                className={`px-3 py-1.5 ${mode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setMode(m)}
              >
                {m === 'chunks' ? 'Pre-token chunks' : 'Final tokens'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Characters line up across rows. Bars mark a split:{' '}
          <span className="inline-block w-0.5 h-3 align-middle bg-gray-400" /> every tokenizer splits here,{' '}
          <span className="inline-block w-0.5 h-3 align-middle bg-red-600" /> only some do. Faded text is dropped by
          that pre-tokenizer. Positions are on the input text; ≈ marks rows where normalization changed the text, so
          they are estimated.
        </p>
        {Array.from(data.text).length > MAX_GRID_CHARS ? (
          <p className="text-xs text-gray-400">
            Text is longer than {MAX_GRID_CHARS} characters; shorten it to see the aligned view.
          </p>
        ) : (
          <AlignmentGrid text={data.text} results={data.results} mode={mode} />
        )}
      </div>

      <SummaryTable results={data.results} />

      <div className="grid md:grid-cols-2 gap-4">
        <AgreementMatrix
          title="Chunk boundary agreement"
          ids={ids}
          matrix={data.chunk_agreement}
          help="F1 between the positions where two pre-tokenizers split the text (100 = identical splits)."
        />
        <AgreementMatrix
          title="Token boundary agreement"
          ids={ids}
          matrix={data.token_agreement}
          help="F1 between final token boundaries: how similarly the two tokenizers segment this text."
        />
      </div>
    </div>
  );
}
