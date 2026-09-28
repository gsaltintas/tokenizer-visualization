import { createContext, useContext } from 'react';
import type { TokenizerInfo } from '../types';

export const TokenizerContext = createContext<{
  activeTokenizerId: string | null;
  setActiveTokenizer: (id: string | null) => void;
  comparisonIds: string[];
  setComparisonIds: (ids: string[]) => void;
  toggleComparison: (id: string) => void;
  // Tokenizers this browser has loaded (persisted in localStorage, not shared across users)
  loadedTokenizers: TokenizerInfo[];
  addLoadedTokenizer: (tok: TokenizerInfo) => void;
  removeLoadedTokenizer: (id: string) => void;
}>({
  activeTokenizerId: null,
  setActiveTokenizer: () => {},
  comparisonIds: [],
  setComparisonIds: () => {},
  toggleComparison: () => {},
  loadedTokenizers: [],
  addLoadedTokenizer: () => {},
  removeLoadedTokenizer: () => {},
});

export function useTokenizer() {
  return useContext(TokenizerContext);
}

// Backend tokenizer ids are `name` or `name::subfolder` (see registry._cache_key).
export function splitTokenizerId(id: string): [string, string | undefined] {
  const idx = id.indexOf('::');
  return idx === -1 ? [id, undefined] : [id.slice(0, idx), id.slice(idx + 2)];
}

const STORAGE_KEY = 'tokenizer-explorer:loaded-tokenizers';

export function readStoredTokenizers(): TokenizerInfo[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((t) => t && typeof t.id === 'string') : [];
  } catch {
    return [];
  }
}

export function writeStoredTokenizers(tokenizers: TokenizerInfo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokenizers));
  } catch {
    // storage unavailable (private mode, quota) — list just won't persist
  }
}
