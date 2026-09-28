import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getVisualizeSamples, visualizeText } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import type { VisualizeResult, VisualizeSegment, VisualizeStats } from '../../types';

// Same six-colour cycle as the CLI's ANSI backgrounds.
const BG_COLORS = [
  'bg-sky-200',
  'bg-amber-200',
  'bg-emerald-200',
  'bg-violet-200',
  'bg-orange-200',
  'bg-cyan-200',
];

const CUSTOM = '__custom__';

function visible(ch: string): string {
  if (ch === ' ') return '·';
  if (ch === '\t') return '→';
  if (ch === '\r') return '␍';
  return ch;
}

// Split segments into source lines. The newline character itself is kept as a
// trailing "↵" on its line so tokens that merge a newline stay visible.
function toLines(segments: VisualizeSegment[]): VisualizeSegment[][] {
  const lines: VisualizeSegment[][] = [[]];
  for (const seg of segments) {
    const parts = seg.text.split('\n');
    parts.forEach((part, i) => {
      if (part) lines[lines.length - 1].push({ ...seg, text: part });
      if (i < parts.length - 1) {
        lines[lines.length - 1].push({ ...seg, text: '↵' });
        lines.push([]);
      }
    });
  }
  return lines;
}

function SourceView({ result }: { result: VisualizeResult }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const lines = useMemo(() => toLines(result.segments ?? []), [result.segments]);
  const tokens = result.tokens ?? [];
  const gutter = String(lines.length).length;

  return (
    <pre className="text-sm font-mono leading-6 overflow-x-auto bg-white p-3">
      {lines.map((line, li) => (
        <div key={li} className="whitespace-pre">
          <span className="select-none text-gray-400 inline-block text-right mr-3" style={{ width: `${gutter}ch` }}>
            {li + 1}
          </span>
          {line.map((seg, si) => {
            const tok = seg.token == null ? null : tokens[seg.token];
            const isNewline = seg.text === '↵';
            const title = tok
              ? `#${seg.token}  id ${tok.id}  ${JSON.stringify(tok.raw)}` +
                (seg.split ? `\neach character here is split across ${seg.split} byte-tokens` : '')
              : 'not covered by any token';
            let cls = seg.token == null ? '' : BG_COLORS[seg.token % BG_COLORS.length];
            if (seg.split) cls = 'bg-red-600 text-white';
            if (seg.token != null && seg.token === hovered) cls += ' outline outline-2 outline-gray-900';
            return (
              <span
                key={si}
                title={title}
                className={`${cls} ${isNewline ? 'text-gray-500' : ''}`}
                onMouseEnter={() => setHovered(seg.token)}
                onMouseLeave={() => setHovered(null)}
              >
                {isNewline ? seg.text : Array.from(seg.text).map(visible).join('')}
              </span>
            );
          })}
        </div>
      ))}
    </pre>
  );
}

function RawTokens({ result }: { result: VisualizeResult }) {
  return (
    <div className="p-3 bg-white font-mono text-sm leading-7 break-all">
      {(result.tokens ?? []).map((t, i) => (
        <span key={i} title={`id ${t.id}`} className={`${BG_COLORS[i % BG_COLORS.length]} px-px`}>
          {t.raw}
        </span>
      ))}
    </div>
  );
}

function StatsLine({ stats, nTokens }: { stats: VisualizeStats; nTokens: number }) {
  return (
    <div className="px-3 py-2 border-t bg-gray-50 text-xs text-gray-600 space-y-1 font-mono">
      <div>
        Whitespace tokens: {stats.whitespace_tokens}/{nTokens}
        {'  |  '}Newline tokens: {stats.newline_tokens}
        {'  |  '}Indentation tokens: {stats.indentation_tokens}
        {stats.newline_indent_tokens > 0 && ` (${stats.newline_indent_tokens} merged with newline)`}
        {stats.special_tokens > 0 && `  |  Special: ${stats.special_tokens}`}
      </div>
      {stats.split_chars > 0 && (
        <div className="text-red-700">
          Sub-character splits: {stats.split_chars} char(s) split across multiple byte-tokens (
          {stats.hidden_tokens} hidden token(s), shown in red)
        </div>
      )}
      {stats.indent_patterns.length > 0 && (
        <div>
          Indent patterns (spaces per token):{' '}
          {stats.indent_patterns.map((p) => `(${p.spaces_per_token.join(', ')}) x${p.count}`).join(', ')}
        </div>
      )}
      {stats.tokens_per_indent_depth.length > 0 && (
        <div>
          Tokens per indent depth:{' '}
          {stats.tokens_per_indent_depth.map((d) => `${d.depth}sp=${d.avg_tokens.toFixed(1)}tok`).join(', ')}
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: VisualizeResult }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b bg-gray-50 flex items-baseline gap-2">
        <span className="font-medium text-gray-900 text-sm">{result.name ?? result.tokenizer_id}</span>
        {result.n_tokens != null && <span className="text-xs text-gray-500">{result.n_tokens} tokens</span>}
        {result.has_offsets === false && (
          <span className="text-xs text-amber-700">no character offsets: showing raw token strings</span>
        )}
      </div>
      {result.error ? (
        <p className="p-3 text-sm text-red-600">{result.error}</p>
      ) : result.has_offsets ? (
        <>
          <SourceView result={result} />
          {result.stats && <StatsLine stats={result.stats} nTokens={result.n_tokens ?? 0} />}
        </>
      ) : (
        <RawTokens result={result} />
      )}
    </div>
  );
}

export function VisualizeView() {
  const { activeTokenizerId, comparisonIds } = useTokenizer();
  const { data: samples = [] } = useQuery({ queryKey: ['visualize-samples'], queryFn: getVisualizeSamples });

  const [choice, setChoice] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const selected = choice ?? samples[0]?.label ?? CUSTOM;
  const text = selected === CUSTOM ? customText : samples.find((s) => s.label === selected)?.text ?? '';

  const tokenizerIds = useMemo(
    () => [...new Set([activeTokenizerId, ...comparisonIds].filter((x): x is string => !!x))],
    [activeTokenizerId, comparisonIds],
  );

  const mutation = useMutation({
    mutationFn: ({ ids, t }: { ids: string[]; t: string }) => visualizeText(ids, t),
  });
  const { mutate } = mutation;

  // Re-render automatically for the built-in samples; custom text waits for the button.
  useEffect(() => {
    if (selected !== CUSTOM && text && tokenizerIds.length) mutate({ ids: tokenizerIds, t: text });
  }, [selected, text, tokenizerIds, mutate]);

  if (!tokenizerIds.length) {
    return <div className="p-8 text-center text-gray-500">Load a tokenizer to visualize token boundaries.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Token Boundaries</h1>
        <p className="text-sm text-gray-500 mt-1">
          How tokenizers split code, math and multilingual text, as in{' '}
          <a
            href="https://github.com/cimeister/tokenizer-intrinsic-evals/blob/master/docs/VISUALIZATION.md"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            TokEval's <code>tokenizer-visualize</code>
          </a>
          . Background colour changes at each token boundary; <span className="text-gray-700">·</span> is a
          space, <span className="text-gray-700">→</span> a tab, <span className="text-gray-700">↵</span> a
          newline. <span className="bg-red-600 text-white px-1">Red</span> marks a character split across
          byte-tokens. Hover to see the token.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Showing the active tokenizer plus any ticked under Compare in the sidebar ({tokenizerIds.length}).
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[...samples.map((s) => s.label), CUSTOM].map((label) => (
          <button
            key={label}
            onClick={() => setChoice(label)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${
              selected === label
                ? 'bg-blue-50 border-blue-400 text-blue-800'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label === CUSTOM ? 'Your text' : label}
          </button>
        ))}
      </div>

      {selected === CUSTOM && (
        <div className="space-y-2">
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono resize-y min-h-[140px] focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Paste code, math or text in any language…"
          />
          <button
            onClick={() => mutate({ ids: tokenizerIds, t: customText })}
            disabled={!customText || mutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Tokenizing…' : 'Visualize'}
          </button>
        </div>
      )}

      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}

      <div className={`space-y-4 ${mutation.isPending ? 'opacity-50' : ''}`}>
        {mutation.data?.map((r) => <ResultPanel key={r.tokenizer_id} result={r} />)}
      </div>
    </div>
  );
}
