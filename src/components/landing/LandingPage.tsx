import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loadTokenizer } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { PRESET_TOKENIZERS, TOKEN_COLORS } from '../../constants';

// Illustrative segmentations of the same word under different vocabularies.
const DEMO_SPLITS = [
  ['un', 'believ', 'ably'],
  ['unbel', 'iev', 'ably'],
  ['un', 'bel', 'iev', 'ably'],
  ['unbelievably'],
  ['u', 'nb', 'eli', 'ev', 'ably'],
];

const FEATURE_GROUPS = [
  {
    title: 'Inspect',
    blurb: 'See exactly what a tokenizer does to your text.',
    items: [
      { to: '/tokenize', icon: '✦', label: 'Tokenize', desc: 'Split text into tokens with IDs, bytes and hex, then export as PNG or PDF.' },
      { to: '/pretokenize', icon: '⚙', label: 'Pre-tokenization', desc: 'Step through normalization and pre-tokenization before the core algorithm runs.' },
      { to: '/vocab', icon: '📖', label: 'Vocabulary', desc: 'Browse and search the full vocabulary.' },
    ],
  },
  {
    title: 'Analyze',
    blurb: 'Measure how vocabularies differ in coverage and efficiency.',
    items: [
      { to: '/multiplicity', icon: '⊕', label: 'Multiplicity', desc: 'Find every variant of a string in the vocabulary: casing, spacing, prefixes.' },
      { to: '/language', icon: '🌐', label: 'Language', desc: 'Break the vocabulary down by script and language.' },
      { to: '/intrinsic-eval', icon: '📊', label: 'Intrinsic Eval', desc: 'TokEval metrics per text, plus FLORES+ corpus-level metrics.' },
      { to: '/compare', icon: '⇌', label: 'Comparison', desc: 'Vocabulary overlap and efficiency across two or more tokenizers.' },
    ],
  },
  {
    title: 'Understand BPE',
    blurb: 'Trace how merges build tokens up from bytes.',
    items: [
      { to: '/merge-tree', icon: '🌲', label: 'Merge Tree', desc: 'Compare how two BPE tokenizers assemble the same input.' },
      { to: '/merge-forest', icon: '🌳', label: 'Merge Forest', desc: 'Explore the full forest of merges a BPE vocabulary is built from.' },
    ],
  },
];

function SplitDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % DEMO_SPLITS.length), 1800);
    return () => clearInterval(timer);
  }, []);

  const split = DEMO_SPLITS[step];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
        <span className="font-mono">"unbelievably"</span>
        <span>
          vocabulary {step + 1} / {DEMO_SPLITS.length}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1 min-h-[3.5rem]">
        {split.map((piece, i) => (
          <span
            key={`${step}-${i}`}
            className={`inline-block px-2 py-1 rounded border font-mono text-2xl animate-[chip-in_300ms_ease-out_both] ${TOKEN_COLORS[i % TOKEN_COLORS.length]}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {piece}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-500">
        {split.length} token{split.length === 1 ? '' : 's'}. Same word, different vocabulary, different pieces.
      </p>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setActiveTokenizer } = useTokenizer();

  const loadMutation = useMutation({
    mutationFn: (name: string) => loadTokenizer(name),
    onSuccess: (tok) => {
      setActiveTokenizer(tok.id);
      queryClient.invalidateQueries({ queryKey: ['tokenizers'] });
      navigate('/tokenize');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <span className="text-lg font-bold">Tokenizer Explorer</span>
        <Link to="/tokenize" className="text-sm font-medium text-gray-600 hover:text-gray-900">
          Open the app →
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-16 grid gap-10 lg:grid-cols-2 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            See how language models<br className="hidden sm:block" /> read your text.
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-xl">
            Load any tiktoken or Hugging Face tokenizer and inspect it end to end: how it splits text,
            what its vocabulary covers, how efficient it is across languages, and how its BPE merges fit together.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/tokenize"
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Start exploring
            </Link>
            <a
              href="#features"
              className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              See what's inside
            </a>
          </div>
        </div>
        <SplitDemo />
      </section>

      {/* Quick start */}
      <section className="border-y border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Quick start</h2>
          <p className="mt-1 text-sm text-gray-600">Pick a tokenizer to load it and jump straight into the tokenize view.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESET_TOKENIZERS.map((name) => {
              const pending = loadMutation.isPending && loadMutation.variables === name;
              return (
                <button
                  key={name}
                  onClick={() => loadMutation.mutate(name)}
                  disabled={loadMutation.isPending}
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 font-mono text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 transition-colors"
                >
                  {pending ? 'Loading…' : name}
                </button>
              );
            })}
          </div>
          {loadMutation.isError && (
            <p className="mt-3 text-sm text-red-500">{(loadMutation.error as Error).message}</p>
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        {FEATURE_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="text-2xl font-bold">{group.title}</h2>
            <p className="mt-1 text-gray-600">{group.blurb}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center text-lg">{item.icon}</span>
                    <span className="font-semibold group-hover:text-blue-700">{item.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <footer className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-gray-500 flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>Tokenizer Explorer</span>
          <a
            href="https://github.com/cimeister/tokenizer-intrinsic-evals"
            className="hover:text-gray-700"
            target="_blank"
            rel="noreferrer"
          >
            Intrinsic evals: tokenizer-intrinsic-evals
          </a>
        </div>
      </footer>
    </div>
  );
}
