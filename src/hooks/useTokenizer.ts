import { createContext, useContext } from 'react';

export const TokenizerContext = createContext<{
  activeTokenizerId: string | null;
  setActiveTokenizer: (id: string) => void;
  comparisonIds: string[];
  toggleComparison: (id: string) => void;
}>({
  activeTokenizerId: null,
  setActiveTokenizer: () => {},
  comparisonIds: [],
  toggleComparison: () => {},
});

export function useTokenizer() {
  return useContext(TokenizerContext);
}
