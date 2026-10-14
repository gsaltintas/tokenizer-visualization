import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pretokenizeText, tokenizeText } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { TokenChips } from '../shared/TokenChip';
import { useTokenColors } from '../../tokenColors';
import type { EncodingInfo } from '../../types';

function ChunkChip({ text, index }: { text: string; index: number }) {
  const { chunkStyle } = useTokenColors();
  const display = text.replace(/ /g, '·').replace(/\n/g, '↵');
  return (
    <span className="inline-block px-1.5 py-0.5 mx-px rounded border text-sm font-mono" style={chunkStyle(index)}>
      {display}
    </span>
  );
}

function DiffDisplay({ before, after }: { before: string; after: string }) {
  if (before === after) {
    return <span className="font-mono text-sm text-gray-600">{before || <em className="text-gray-400">empty</em>}</span>;
  }
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <span className="text-xs font-medium text-red-500 w-8 shrink-0 pt-0.5">before</span>
        <span className="font-mono text-sm bg-red-50 border border-red-200 rounded px-2 py-0.5 text-red-800 break-all">{before}</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-xs font-medium text-green-600 w-8 shrink-0 pt-0.5">after</span>
        <span className="font-mono text-sm bg-green-50 border border-green-200 rounded px-2 py-0.5 text-green-800 break-all">{after}</span>
      </div>
    </div>
  );
}

function Step({ number, label, children }: { number: number; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
          {number}
        </div>
        <div className="flex-1 w-px bg-blue-200 mt-1" />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{label}</h3>
        {children}
      </div>
    </div>
  );
}

export function PreTokenizeView() {
  const { activeTokenizerId } = useTokenizer();
  const [text, setText] = useState('Hello world! Héllo wörld — 你好世界 🎉');
  const [debouncedText, setDebouncedText] = useState(text);
  const [showRegex, setShowRegex] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(text), 300);
    return () => clearTimeout(t);
  }, [text]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['pretokenize', activeTokenizerId, debouncedText],
    queryFn: () => pretokenizeText(activeTokenizerId!, debouncedText),
    enabled: !!activeTokenizerId && debouncedText.length > 0,
  });

  const { data: tokenData } = useQuery({
    queryKey: ['tokenize', activeTokenizerId, debouncedText],
    queryFn: () => tokenizeText(activeTokenizerId!, debouncedText),
    enabled: !!activeTokenizerId && debouncedText.length > 0,
  });

  if (!activeTokenizerId) {
    return (
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Pre-tokenization &amp; Normalization</h2>
        <p className="text-gray-500">Load a tokenizer from the sidebar to get started.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Pre-tokenization &amp; Normalization</h2>
      <p className="text-sm text-gray-500 mb-5">
        Visualizes the pipeline steps a tokenizer applies <em>before</em> running its core algorithm (BPE, Unigram, etc.).
      </p>

      <textarea
        className="w-full h-28 px-4 py-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to analyze..."
      />

      {isLoading && <p className="text-gray-500 text-sm">Analyzing...</p>}
      {error && <p className="text-red-500 text-sm">{(error as Error).message}</p>}

      {data && (
        <div className="space-y-0">

          {/* Step 1 — Raw input */}
          <Step number={1} label="Raw input">
            <div className="p-3 bg-gray-50 rounded border text-sm font-mono break-all text-gray-800">
              {text || <em className="text-gray-400">empty</em>}
            </div>
            <p className="text-xs text-gray-400 mt-1">{text.length} chars · {new TextEncoder().encode(text).length} bytes</p>
          </Step>

          {/* Step 2 — Normalization */}
          <Step number={2} label={`Normalization — ${data.normalization.type}`}>
            <div className="p-3 bg-white rounded border">
              {data.normalization.changed ? (
                <DiffDisplay before={text} after={data.normalization.normalized_text} />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium">
                    No change
                  </span>
                  <span className="text-xs text-gray-500">Text is identical after normalization</span>
                </div>
              )}
            </div>
            {data.normalization.type === 'none' && (
              <p className="text-xs text-gray-400 mt-1">This tokenizer does not apply Unicode normalization.</p>
            )}
          </Step>

          {/* Step 3 — script_tok encoding into atomic tokens, which happens before pre-tokenization */}
          {data.encoding && (
            <Step
              number={3}
              label={`Encoding — ${data.encoding.type === 'script_encoding' ? 'SCRIPT encoding' : 'UTF-8 bytes'}`}
            >
              <EncodingDisplay encoding={data.encoding} />
            </Step>
          )}

          {/* Pretokenization */}
          <Step number={data.encoding ? 4 : 3} label={`Pre-tokenization — ${data.pretokenizer_type}`}>
            <p className="text-xs text-gray-500 mb-2">{data.pretokenizer_description}</p>

            {data.pretokenizer_type !== 'none' && (
              <div className="p-3 bg-white rounded border mb-2">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  {data.chunk_count} chunk{data.chunk_count !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-y-1">
                  {data.chunks.map((chunk, i) => (
                    <ChunkChip key={i} text={chunk} index={i} />
                  ))}
                </div>
              </div>
            )}

            {data.regex_pattern && (
              <div className="mt-1">
                <button
                  onClick={() => setShowRegex((v) => !v)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {showRegex ? 'Hide' : 'Show'} regex pattern
                </button>
                {showRegex && (
                  <pre className="mt-2 p-3 bg-gray-900 text-green-300 text-xs rounded overflow-x-auto whitespace-pre-wrap break-all">
                    {data.regex_pattern}
                  </pre>
                )}
              </div>
            )}
          </Step>

          {/* Final tokens */}
          <Step number={data.encoding ? 5 : 4} label="Final tokens (after BPE/Unigram/WordPiece)">
            {tokenData ? (
              <div className="p-3 bg-white rounded border">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  {tokenData.token_count} token{tokenData.token_count !== 1 ? 's' : ''}
                  {data.chunk_count > 0 && (
                    <span className="text-gray-400 ml-2">
                      ({(tokenData.token_count / data.chunk_count).toFixed(2)} tokens per chunk on average)
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-y-1">
                  <TokenChips tokens={tokenData.tokens} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Loading tokens...</p>
            )}
          </Step>

          {/* Chunk → token breakdown table */}
          {data.pretokenizer_type !== 'none' && tokenData && data.chunks.length > 0 && (
            <div className="ml-11 mt-2 p-4 bg-white rounded border">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Chunk → token mapping</h3>
              <p className="text-xs text-gray-400 mb-3">
                Each pretokenization chunk is tokenized independently. This shows how the algorithm distributes tokens within chunks.
              </p>
              <ChunkTokenTable
                chunks={data.chunks}
                spans={data.chunk_spans}
                normalizedText={data.normalization.normalized_text}
                tokenizerId={activeTokenizerId}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const MAX_ENCODED_UNITS = 300;

// "<|BLOCK_Latin_LM_0|>" -> "Latin LM 0", "<|SCRIPT_INDEX_211|>" -> "#211", "<BYTE_C5>" -> "C5"
function atomicLabel(label: string): string {
  const block = label.match(/^<\|BLOCK_(.*)\|>$/);
  if (block) return block[1].replace(/_/g, ' ');
  const index = label.match(/^<\|SCRIPT_INDEX_(\d+)\|>$/);
  if (index) return `#${index[1]}`;
  const byte = label.match(/^<BYTE_([0-9A-F]{2})>$/);
  if (byte) return byte[1];
  return label;
}

function EncodingDisplay({ encoding }: { encoding: EncodingInfo }) {
  const { chunkStyle } = useTokenColors();
  // Color characters by their first atomic token (the script block, or the lead byte),
  // so characters that share a block share a color
  const colorIndex = new Map<number, number>();
  for (const unit of encoding.units) {
    const key = unit.atomic_ids[0];
    if (!colorIndex.has(key)) colorIndex.set(key, colorIndex.size);
  }
  const shown = encoding.units.slice(0, MAX_ENCODED_UNITS);
  const atomicCount = encoding.units.reduce((n, u) => n + u.atomic_ids.length, 0);

  return (
    <>
      <p className="text-xs text-gray-500 mb-2">{encoding.description}</p>
      <div className="p-3 bg-white rounded border">
        <p className="text-xs font-medium text-gray-600 mb-2">
          {encoding.units.length} character{encoding.units.length !== 1 ? 's' : ''} → {atomicCount} atomic token
          {atomicCount !== 1 ? 's' : ''}
          {encoding.type === 'script_encoding' && (
            <span className="text-gray-400 font-normal ml-2">(script block + index within the block; color = block)</span>
          )}
        </p>
        <div className="flex flex-wrap gap-1">
          {shown.map((unit, i) => (
            <span
              key={i}
              className="inline-flex flex-col self-start rounded border font-mono text-center"
              style={chunkStyle(colorIndex.get(unit.atomic_ids[0]) ?? 0)}
              title={unit.atomic_labels.map((l, k) => `${l} (id ${unit.atomic_ids[k]})`).join('\n')}
            >
              <span className="px-1.5 py-0.5 text-sm leading-tight">
                {unit.text.replace(/ /g, '·').replace(/\n/g, '↵').replace(/\t/g, '⇥')}
              </span>
              <span className="flex border-t border-black/10">
                {unit.atomic_labels.map((label, k) => (
                  <span key={k} className={`px-1 text-[10px] leading-tight whitespace-nowrap ${k > 0 ? 'border-l border-black/10' : ''}`}>
                    {atomicLabel(label)}
                  </span>
                ))}
              </span>
            </span>
          ))}
        </div>
        {encoding.units.length > MAX_ENCODED_UNITS && (
          <p className="text-xs text-gray-400 mt-2">Showing the first {MAX_ENCODED_UNITS} characters.</p>
        )}
      </div>
    </>
  );
}

interface ChunkTokenTableProps {
  chunks: string[];
  spans: [number, number][];
  normalizedText: string;
  tokenizerId: string;
}

function ChunkTokenTable({ chunks, spans, normalizedText, tokenizerId }: ChunkTokenTableProps) {
  const { chunkStyle } = useTokenColors();
  // Tokenize each chunk's span of the actual text: chunks themselves can be in
  // the pretokenizer's internal alphabet (ByteLevel shows a space as Ġ), and
  // re-encoding those characters literally would tokenize the wrong bytes.
  const sources = chunks.map((chunk, i) => (spans[i] ? normalizedText.slice(spans[i][0], spans[i][1]) : chunk));
  const { data: allTokenData } = useQuery({
    queryKey: ['tokenize', tokenizerId, sources.join('\x00')],
    queryFn: () =>
      Promise.all(sources.map((source) => tokenizeText(tokenizerId, source))),
    enabled: chunks.length > 0 && chunks.length <= 50,
  });

  if (!allTokenData) return <p className="text-xs text-gray-400">Loading chunk breakdown...</p>;
  if (chunks.length > 50) return <p className="text-xs text-gray-400">Too many chunks to show breakdown (max 50).</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="px-2 py-1 font-medium">#</th>
            <th className="px-2 py-1 font-medium">Chunk</th>
            <th className="px-2 py-1 font-medium">Tokens</th>
            <th className="px-2 py-1 font-medium text-right">Count</th>
          </tr>
        </thead>
        <tbody>
          {chunks.map((chunk, i) => {
            const td = allTokenData[i];
            return (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-2 py-1.5 text-gray-400 font-mono">{i}</td>
                <td className="px-2 py-1.5">
                  <span className="inline-block px-1.5 py-0.5 rounded border font-mono" style={chunkStyle(i)}>
                    {chunk.replace(/ /g, '·') || <em className="opacity-50">space</em>}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex flex-wrap gap-y-0.5">
                    {td && <TokenChips tokens={td.tokens} />}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right text-gray-500 font-mono">{td?.token_count ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
