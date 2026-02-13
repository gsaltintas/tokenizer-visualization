import { useState } from 'react';
import type { TokenInfo } from '../../types';

const TOKEN_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
];

interface TokenChipProps {
  token: TokenInfo;
  index: number;
  showId?: boolean;
}

export function TokenChip({ token, index, showId = false }: TokenChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colorClass = TOKEN_COLORS[index % TOKEN_COLORS.length];
  const displayStr = token.token_str.replace(/ /g, '\u00B7').replace(/\n/g, '\u21B5');

  return (
    <span
      className={`relative inline-block px-1 py-0.5 mx-px rounded border text-sm font-mono cursor-default ${colorClass}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {displayStr}
      {showId && (
        <span className="ml-1 text-xs opacity-60">{token.id}</span>
      )}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
          <div>ID: {token.id}</div>
          <div>Bytes: {token.byte_length}</div>
          <div>Hex: {token.token_bytes_hex}</div>
        </div>
      )}
    </span>
  );
}
