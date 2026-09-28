import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TokenizerContext, readStoredTokenizers, writeStoredTokenizers } from './hooks/useTokenizer';
import type { TokenizerInfo } from './types';
import { TokenizerUrlSync } from './hooks/TokenizerUrlSync';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './components/landing/LandingPage';
import { TokenizeView } from './components/tokenize/TokenizeView';
import { VocabView } from './components/vocabulary/VocabView';
import { MultiplicityView } from './components/multiplicity/MultiplicityView';
import { LanguageView } from './components/language/LanguageView';
import { MorphemeView } from './components/morphemes/MorphemeView';
import { UndertrainedView } from './components/undertrained/UndertrainedView';
import { ComparisonView } from './components/comparison/ComparisonView';
import { MergeTreeView } from './components/merge-tree/MergeTreeView';
import { MergeForestView } from './components/merge-forest/MergeForestView';
import { IntrinsicEvalView } from './components/intrinsic-eval/IntrinsicEvalView';
import { PreTokenizeView } from './components/pretokenize/PreTokenizeView';
import { VisualizeView } from './components/visualize/VisualizeView';
import { SanityCheckView } from './components/sanity/SanityCheckView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function App() {
  const [activeTokenizerId, setActiveTokenizer] = useState<string | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);

  const [loadedTokenizers, setLoadedTokenizers] = useState<TokenizerInfo[]>(readStoredTokenizers);

  useEffect(() => writeStoredTokenizers(loadedTokenizers), [loadedTokenizers]);

  const toggleComparison = useCallback((id: string) => {
    setComparisonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const addLoadedTokenizer = useCallback((tok: TokenizerInfo) => {
    setLoadedTokenizers((prev) =>
      prev.some((t) => t.id === tok.id) ? prev.map((t) => (t.id === tok.id ? tok : t)) : [...prev, tok]
    );
  }, []);

  const removeLoadedTokenizer = useCallback((id: string) => {
    setLoadedTokenizers((prev) => prev.filter((t) => t.id !== id));
    setComparisonIds((prev) => prev.filter((x) => x !== id));
    setActiveTokenizer((cur) => (cur === id ? null : cur));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TokenizerContext.Provider
        value={{
          activeTokenizerId,
          setActiveTokenizer,
          comparisonIds,
          setComparisonIds,
          toggleComparison,
          loadedTokenizers,
          addLoadedTokenizer,
          removeLoadedTokenizer,
        }}
      >
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <TokenizerUrlSync />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<Layout />}>
              <Route path="/tokenize" element={<TokenizeView />} />
              <Route path="/vocab" element={<VocabView />} />
              <Route path="/multiplicity" element={<MultiplicityView />} />
              <Route path="/language" element={<LanguageView />} />
              <Route path="/morphemes" element={<MorphemeView />} />
              <Route path="/undertrained" element={<UndertrainedView />} />
              <Route path="/compare" element={<ComparisonView />} />
              <Route path="/merge-tree" element={<MergeTreeView />} />
              <Route path="/merge-forest" element={<MergeForestView />} />
              <Route path="/intrinsic-eval" element={<IntrinsicEvalView />} />
              <Route path="/pretokenize" element={<PreTokenizeView />} />
              <Route path="/visualize" element={<VisualizeView />} />
              <Route path="/sanity-check" element={<SanityCheckView />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TokenizerContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
