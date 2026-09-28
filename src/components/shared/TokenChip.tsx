import { useState } from 'react';
import type { TokenInfo } from '../../types';

import { tokenColorStyle } from '../../constants';

interface TokenChipProps {
  token: TokenInfo;
  index: number;
  showId?: boolean;
}

export function TokenChip({ token, index, showId = false }: TokenChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const displayStr = token.token_str.replace(/ /g, '\u00B7').replace(/\n/g, '\u21B5');

  return (
    <span
      className="relative inline-block px-1 py-0.5 mx-px rounded border text-sm font-mono cursor-default"
      style={tokenColorStyle(index)}
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
