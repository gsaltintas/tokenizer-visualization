import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { floresEval, getFloresLanguages, perTextMetrics, ustatEval } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import type { FloresEvalResponse, PerTextMetrics, UStatToken } from '../../types';

// ── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, decimals = 3): string {
  if (v == null) return '—';
  return v.toFixed(decimals);
}

function pct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

// ── sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function PerTextSection({ tokenizerId }: { tokenizerId: string }) {
  const [text, setText] = useState('The quick brown fox jumps over the lazy dog.');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (t: string) => perTextMetrics(tokenizerId, t),
  });

  const handleRun = () => {
    setSubmitted(true);
    mutation.mutate(text);
  };

  const m: PerTextMetrics | undefined = mutation.data?.metrics;

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Per-text metrics</h2>
      <p className="text-sm text-gray-500">
        Computed on-the-fly for any input text using the{' '}
        <a
          href="https://github.com/cimeister/tokenizer-intrinsic-evals"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          TokEval
        </a>{' '}
        library.
      </p>

      <textarea
        className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to evaluate…"
        rows={3}
      />

      <button
        onClick={handleRun}
        disabled={!text.trim() || mutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Computing…' : 'Run metrics'}
      </button>

      {mutation.isError && (
        <p className="text-sm text-red-600">{String(mutation.error)}</p>
      )}

      {submitted && m && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              Basic
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricCard label="Tokens" value={String(m.n_tokens)} />
              <MetricCard label="Words" value={String(m.n_words)} />
              <MetricCard label="Bytes" value={String(m.n_bytes)} />
              <MetricCard label="Chars" value={String(m.n_chars)} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              Efficiency
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricCard
                label="Fertility"
                value={fmt(m.fertility_words)}
                sub="tokens / word"
              />
              <MetricCard
                label="Bytes / token"
                value={fmt(m.bytes_per_token)}
              />
              <MetricCard
                label="Chars / token"
                value={fmt(m.chars_per_token)}
              />
              <MetricCard
                label="Tokens / byte"
                value={fmt(m.tokens_per_byte)}
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
              UTF-8 integrity
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <MetricCard
                label="Integrity rate"
                value={pct(m.integrity_rate)}
                sub="valid complete UTF-8 tokens"
              />
              <MetricCard
                label="Boundary crossing"
                value={pct(m.boundary_crossing_rate)}
                sub="tokens spanning char boundaries"
              />
              <MetricCard
                label="Byte-fallback rate"
                value={pct(m.byte_fallback_rate)}
                sub="<0xAB>-style tokens"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function FloresSection({ tokenizerId }: { tokenizerId: string }) {
  const { data: allLangs = [] } = useQuery({
    queryKey: ['flores-languages'],
    queryFn: getFloresLanguages,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nSamples, setNSamples] = useState(200);
  const [result, setResult] = useState<FloresEvalResponse | null>(null);

  const mutation = useMutation({
    mutationFn: ({ codes, n }: { codes: string[]; n: number }) =>
      floresEval(tokenizerId, codes, n),
    onSuccess: (data) => setResult(data),
  });

  const toggleLang = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === allLangs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allLangs.map((l) => l.code)));
    }
  };

  const activeCodes = selected.size > 0 ? [...selected] : allLangs.map((l) => l.code);

  // Group by script for display
  const byScript: Record<string, typeof allLangs> = {};
  for (const l of allLangs) {
    (byScript[l.script] ??= []).push(l);
  }

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">FLORES+ corpus metrics</h2>
      <p className="text-sm text-gray-500">
        Evaluate tokenization efficiency and fairness across languages using the{' '}
        <a
          href="https://huggingface.co/datasets/openlanguagedata/flores_plus"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          FLORES+
        </a>{' '}
        benchmark. Gini coefficient measures how equitably the tokenizer treats
        different languages (lower = fairer).
      </p>

      {/* Language selector */}
      <div className="border border-gray-200 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Languages</span>
          <button
            onClick={toggleAll}
            className="text-xs text-blue-600 hover:underline"
          >
            {selected.size === allLangs.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(byScript).map(([script, langs]) => (
            <div key={script}>
              <div className="text-xs text-gray-400 mb-1">{script}</div>
              <div className="flex flex-wrap gap-1.5">
                {langs.map((l) => {
                  return (
                    <button
                      key={l.code}
                      onClick={() => toggleLang(l.code)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        selected.has(l.code)
                          ? 'bg-blue-100 border-blue-400 text-blue-800'
                          : selected.size === 0
                          ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                          : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Sentences per language:</label>
          <input
            type="number"
            min={10}
            max={1012}
            value={nSamples}
            onChange={(e) => setNSamples(Number(e.target.value))}
            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      <button
        onClick={() => mutation.mutate({ codes: activeCodes, n: nSamples })}
        disabled={mutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending
          ? `Evaluating ${activeCodes.length} languages…`
          : `Run on ${activeCodes.length} language${activeCodes.length !== 1 ? 's' : ''}`}
      </button>

      {mutation.isError && (
        <p className="text-sm text-red-600">{String(mutation.error)}</p>
      )}

      {mutation.isPending && (
        <p className="text-sm text-gray-500 animate-pulse">
          Downloading FLORES+ and tokenizing — this may take a minute…
        </p>
      )}

      {result && !mutation.isPending && (
        <div className="space-y-4">
          {/* Gini summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <MetricCard
              label="Fairness Gini"
              value={fmt(result.gini, 4)}
              sub="lower = more equitable"
            />
            <MetricCard
              label="Languages evaluated"
              value={String(result.n_languages)}
            />
          </div>

          {/* Per-language table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-4 font-medium">Language</th>
                  <th className="py-2 pr-4 font-medium text-right">Fertility</th>
                  <th className="py-2 pr-4 font-medium text-right">Tokens/byte</th>
                  <th className="py-2 pr-4 font-medium text-right">UTF-8 integrity</th>
                  <th className="py-2 pr-4 font-medium text-right">Texts</th>
                </tr>
              </thead>
              <tbody>
                {result.per_language.map((row) => {
                  const langMeta = allLangs.find((l) => l.code === row.code);
                  return (
                    <tr
                      key={row.code}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-1.5 pr-4">
                        <span className="font-medium">
                          {langMeta?.name ?? row.code}
                        </span>
                        <span className="ml-1.5 text-xs text-gray-400">{row.code}</span>
                        {row.error && (
                          <span className="ml-2 text-xs text-red-500">{row.error}</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {fmt(row.fertility)}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {fmt(row.tokens_per_byte)}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {pct(row.integrity_rate)}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-gray-500">
                        {row.n_texts ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function UStatTable({ title, rows }: { title: string; rows: UStatToken[] }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-1 pr-3 font-medium">Token</th>
            <th className="py-1 pr-3 font-medium text-right">U</th>
            <th className="py-1 pr-3 font-medium text-right">PMI min</th>
            <th className="py-1 font-medium text-right">H min</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.token} className="border-b border-gray-100">
              <td className="py-1 pr-3 font-mono whitespace-pre">{JSON.stringify(r.token)}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{fmt(r.ustat, 2)}</td>
              <td className="py-1 pr-3 text-right tabular-nums">{fmt(r.pmi_min, 2)}</td>
              <td className="py-1 text-right tabular-nums">{fmt(r.h_min, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UStatSection({ tokenizerId }: { tokenizerId: string }) {
  const [lang, setLang] = useState('eng_Latn');
  const [nSamples, setNSamples] = useState(500);
  const [acrossSpaces, setAcrossSpaces] = useState(true);
  const { data: langs = [] } = useQuery({ queryKey: ['flores-languages'], queryFn: getFloresLanguages });
  const mutation = useMutation({
    mutationFn: () => ustatEval(tokenizerId, { languageCode: lang, nSamples, acrossSpaces }),
  });
  const r = mutation.data;

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Boundary statistics (U-statistic)</h2>
      <p className="text-sm text-gray-500">
        Per-token score U(w) = min adjacent-character PMI + 4 · min(left, right) branching entropy,
        estimated from a FLORES+ corpus and aggregated over the vocabulary. Metrics from{' '}
        <a href="https://arxiv.org/abs/2610.21679" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          Lopardo et al. (2026)
        </a>
        ; U-statistic from Hu et al. (2025). Note: u_mean is not comparable across languages.
      </p>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Language</span>
          <select className="border border-gray-300 rounded-lg px-2 py-1.5" value={lang} onChange={(e) => setLang(e.target.value)}>
            {langs.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Sentences</span>
          <input type="number" min={1} max={1012} className="border border-gray-300 rounded-lg px-2 py-1.5 w-24"
            value={nSamples} onChange={(e) => setNSamples(Number(e.target.value))} />
        </label>
        <label className="flex items-center gap-1.5 pb-2">
          <input type="checkbox" checked={acrossSpaces} onChange={(e) => setAcrossSpaces(e.target.checked)} />
          <span>Statistics across spaces</span>
        </label>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Computing…' : 'Compute U-statistic'}
        </button>
      </div>
      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}
      {r && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricCard label="u_mean" value={fmt(r.u_mean)} />
            <MetricCard label="u_median" value={fmt(r.u_median)} />
            <MetricCard label="u_mean_weighted" value={fmt(r.u_mean_weighted)} sub="frequency-weighted" />
            <MetricCard label="u_mean_log_weighted" value={fmt(r.u_mean_log_weighted)} sub="log(1+f)-weighted" />
          </div>
          <p className="text-xs text-gray-400">
            {r.n_scored_tokens.toLocaleString()} of {r.n_vocab.toLocaleString()} vocabulary tokens scored
            ({r.n_chars.toLocaleString()} corpus characters).
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <UStatTable title="Highest U (natural units)" rows={r.highest} />
            <UStatTable title="Lowest U (cross boundaries)" rows={r.lowest} />
          </div>
          <p className="text-xs text-gray-400">
            Citation: {r.citation}
          </p>
        </div>
      )}
    </section>
  );
}

// ── main view ────────────────────────────────────────────────────────────────

export function IntrinsicEvalView() {
  const { activeTokenizerId } = useTokenizer();

  if (!activeTokenizerId) {
    return (
      <div className="p-8 text-center text-gray-500">
        Load a tokenizer to begin intrinsic evaluation.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Intrinsic Evaluation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Metrics from the{' '}
          <a
            href="https://github.com/cimeister/tokenizer-intrinsic-evals"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            TokEval
          </a>{' '}
          suite — fertility, compression, UTF-8 integrity, and cross-lingual fairness.
        </p>
      </div>

      <PerTextSection tokenizerId={activeTokenizerId} />
      <hr className="border-gray-200" />
      <FloresSection tokenizerId={activeTokenizerId} />
      <hr className="border-gray-200" />
      <UStatSection tokenizerId={activeTokenizerId} />
    </div>
  );
}
