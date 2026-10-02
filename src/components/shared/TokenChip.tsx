import { useState } from 'react';
import type { TokenInfo } from '../../types';

import { useTokenColors } from '../../tokenColors';

interface TokenChipProps {
  token: TokenInfo;
  index: number;
  showId?: boolean;
}

// Make whitespace and zero-width characters (ZWJ, ZWNJ, BOM, …) visible
const visible = (s: string) =>
  s
    .replace(/ /g, '\u00B7')
    .replace(/\n/g, '\u21B5')
    .replace(/[\u200B-\u200F\u2060\uFEFF]/g, (c) => `\u2039U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}\u203A`);

type BytePart = { text: string } | { byte: string };

// Split a token's bytes into decodable text and stray bytes that only form a
// character together with neighbouring tokens.
function tokenParts(hex: string): BytePart[] {
  const bytes = new Uint8Array((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)));
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const parts: BytePart[] = [];
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    const len = b < 0x80 ? 1 : b >= 0xc2 && b <= 0xdf ? 2 : b >= 0xe0 && b <= 0xef ? 3 : b >= 0xf0 && b <= 0xf4 ? 4 : 0;
    let text: string | null = null;
    if (len && i + len <= bytes.length) {
      try {
        text = decoder.decode(bytes.subarray(i, i + len));
      } catch {
        text = null;
      }
    }
    const last = parts[parts.length - 1];
    if (text !== null) {
      if (last && 'text' in last) last.text += text;
      else parts.push({ text });
      i += len;
    } else {
      parts.push({ byte: b.toString(16).toUpperCase().padStart(2, '0') });
      i += 1;
    }
  }
  return parts;
}

// Token text with stray bytes rendered as small hex badges
export function TokenBytesLabel({ hex }: { hex: string }) {
  return (
    <>
      {tokenParts(hex).map((p, i) =>
        'text' in p ? (
          <span key={i}>{visible(p.text)}</span>
        ) : (
          <span key={i} className="mx-px px-0.5 rounded-sm bg-black/10 text-[0.85em]">
            {p.byte}
          </span>
        ),
      )}
    </>
  );
}

function Tooltip({ token, note }: { token: TokenInfo; note?: string }) {
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
      <div>ID: {token.id}</div>
      <div>Bytes: {token.byte_length}</div>
      <div>Hex: {token.token_bytes_hex}</div>
      {note && <div className="mt-0.5 text-amber-300">{note}</div>}
    </div>
  );
}

export function TokenChip({ token, index, showId = false }: TokenChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { tokenStyle } = useTokenColors();
  const displayStr = visible(token.token_str);

  return (
    <span
      className="relative inline-block self-start px-1 py-0.5 mx-px rounded border text-sm font-mono cursor-default"
      style={tokenStyle(index)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {displayStr}
      {showId && (
        <span className="ml-1 text-xs opacity-60">{token.id}</span>
      )}
      {showTooltip && <Tooltip token={token} />}
    </span>
  );
}

interface TokenGroupChipProps {
  tokens: TokenInfo[];
  startIndex: number;
  showId?: boolean;
}

// Several tokens that only decode together (e.g. an emoji's UTF-8 bytes split
// across tokens): the decoded character on top, one cell per token below.
export function TokenGroupChip({ tokens, startIndex, showId = false }: TokenGroupChipProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const { tokenStyle } = useTokenColors();
  const groupStr = tokens[0].group_str ?? '';

  return (
    <span className="relative inline-flex flex-col self-start mx-px rounded border border-dashed border-gray-500 bg-white font-mono cursor-default overflow-visible">
      <span className="px-1 py-0.5 text-sm text-center leading-tight text-gray-800">
        {visible(groupStr)}
      </span>
      <span className="flex">
        {tokens.map((token, k) => (
          <span
            key={k}
            className={`relative flex-1 flex flex-col items-center px-1 text-[10px] leading-tight border-t ${k > 0 ? 'border-l' : ''}`}
            style={tokenStyle(startIndex + k)}
            onMouseEnter={() => setHovered(k)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="whitespace-nowrap">
              <TokenBytesLabel hex={token.token_bytes_hex} />
            </span>
            {showId && <span className="opacity-60">{token.id}</span>}
            {hovered === k && (
              <Tooltip
                token={token}
                note={`Token ${k + 1} of ${tokens.length} that together decode to ${JSON.stringify(groupStr)}`}
              />
            )}
          </span>
        ))}
      </span>
    </span>
  );
}

// Renders a token sequence, boxing together tokens that share a group_id
export function TokenChips({ tokens, showId = false }: { tokens: TokenInfo[]; showId?: boolean }) {
  const chips = [];
  let i = 0;
  while (i < tokens.length) {
    const group = tokens[i].group_id;
    if (group == null) {
      chips.push(<TokenChip key={i} token={tokens[i]} index={i} showId={showId} />);
      i += 1;
      continue;
    }
    let j = i;
    while (j < tokens.length && tokens[j].group_id === group) j += 1;
    chips.push(<TokenGroupChip key={i} tokens={tokens.slice(i, j)} startIndex={i} showId={showId} />);
    i = j;
  }
  return <>{chips}</>;
}
