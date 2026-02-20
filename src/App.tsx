import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TokenizerContext } from './hooks/useTokenizer';
import { Layout } from './components/layout/Layout';
import { TokenizeView } from './components/tokenize/TokenizeView';
import { VocabView } from './components/vocabulary/VocabView';
import { MultiplicityView } from './components/multiplicity/MultiplicityView';
import { LanguageView } from './components/language/LanguageView';
import { MorphemeView } from './components/morphemes/MorphemeView';
import { UndertrainedView } from './components/undertrained/UndertrainedView';
import { ComparisonView } from './components/comparison/ComparisonView';
import { MergeTreeView } from './components/merge-tree/MergeTreeView';
import { MergeForestView } from './components/merge-forest/MergeForestView';

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

  const toggleComparison = useCallback((id: string) => {
    setComparisonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TokenizerContext.Provider
        value={{ activeTokenizerId, setActiveTokenizer, comparisonIds, toggleComparison }}
      >
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<TokenizeView />} />
              <Route path="/vocab" element={<VocabView />} />
              <Route path="/multiplicity" element={<MultiplicityView />} />
              <Route path="/language" element={<LanguageView />} />
              <Route path="/morphemes" element={<MorphemeView />} />
              <Route path="/undertrained" element={<UndertrainedView />} />
              <Route path="/compare" element={<ComparisonView />} />
              <Route path="/merge-tree" element={<MergeTreeView />} />
              <Route path="/merge-forest" element={<MergeForestView />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TokenizerContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
