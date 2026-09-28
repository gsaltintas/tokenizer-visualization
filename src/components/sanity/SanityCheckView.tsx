import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { runSanityCheck } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import type { SanityCheck, SanityReport, Severity } from '../../types';

const SEVERITY_STYLE: Record<Severity, string> = {
  pass: 'bg-green-100 text-green-800 border-green-300',
  warn: 'bg-amber-100 text-amber-800 border-amber-300',
  fail: 'bg-red-100 text-red-800 border-red-300',
  unverifiable: 'bg-amber-50 text-amber-700 border-amber-300 border-dashed',
  not_applicable: 'bg-gray-100 text-gray-500 border-gray-300',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  pass: 'pass',
  warn: 'warn',
  fail: 'fail',
  unverifiable: 'unverifiable',
  not_applicable: 'n/a',
};

function Badge({ severity, large = false }: { severity: Severity; large?: boolean }) {
  return (
    <span
      className={`inline-block border rounded font-medium uppercase tracking-wide ${
        large ? 'text-sm px-2.5 py-1' : 'text-[0.65rem] px-1.5 py-0.5'
      } ${SEVERITY_STYLE[severity]}`}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

function show(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(4);
  return JSON.stringify(v);
}

function CheckRow({ check }: { check: SanityCheck }) {
  const [open, setOpen] = useState(check.severity === 'fail');
  const [id, ...rest] = check.name.split(' ');
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer align-top" onClick={() => setOpen(!open)}>
        <td className="py-2 pr-3 font-mono text-xs text-gray-400">{id}</td>
        <td className="py-2 pr-3">
          <div className="font-medium text-gray-900">{rest.join(' ')}</div>
          <div className="text-xs text-gray-500">{check.detail}</div>
        </td>
        <td className="py-2 pr-3 text-xs text-gray-400">{check.category}</td>
        <td className="py-2 pr-3 font-mono text-xs text-gray-700 max-w-[14rem] truncate" title={show(check.observed)}>
          {show(check.observed)}
        </td>
        <td className="py-2 pr-3 font-mono text-xs text-gray-500 max-w-[10rem] truncate" title={show(check.threshold)}>
          {show(check.threshold)}
        </td>
        <td className="py-2 text-right">
          <Badge severity={check.severity} />
        </td>
      </tr>
      {open && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td />
          <td colSpan={5} className="py-2 pr-3 text-xs space-y-2">
            <div className="text-gray-600">
              <span className="font-medium text-gray-700">Why it matters: </span>
              {check.rationale}
            </div>
            <div className="font-mono text-gray-700 break-all">
              observed = {show(check.observed)}
              <br />
              threshold = {show(check.threshold)}
            </div>
            {check.examples.length > 0 && (
              <div>
                <div className="font-medium text-gray-700 mb-1">Examples</div>
                <ul className="font-mono text-gray-700 space-y-0.5">
                  {check.examples.map((ex, i) => (
                    <li key={i} className="break-all">{typeof ex === 'string' ? JSON.stringify(ex) : show(ex)}</li>
                  ))}
                </ul>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function KeyValues({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-gray-500">{k}</dt>
            <dd className="font-mono text-gray-800 break-all">{show(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Report({ report }: { report: SanityReport }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Badge severity={report.overall_severity} large />
        <span className="text-sm text-gray-700">
          {report.n_fail} failing, {report.n_warn} warning or unverifiable, of {report.checks.length} checks
        </span>
        <span className="text-xs text-gray-500">
          CLI exit code <span className="font-mono">{report.exit_code}</span>
          {report.exit_code === 0 ? ' (would pass a gate)' : ' (would block a gate)'}
        </span>
      </div>

      {report.warnings.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-xs text-amber-800 space-y-1">
          {report.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="py-2 pr-3 font-medium" />
              <th className="py-2 pr-3 font-medium">Check</th>
              <th className="py-2 pr-3 font-medium">Kind</th>
              <th className="py-2 pr-3 font-medium">Observed</th>
              <th className="py-2 pr-3 font-medium">Threshold</th>
              <th className="py-2 font-medium text-right">Result</th>
            </tr>
          </thead>
          <tbody>
            {report.checks.map((c) => (
              <CheckRow key={c.name} check={c} />
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-2">Click a row for the rationale and examples.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <KeyValues title="Pipeline components" data={report.components} />
        <KeyValues title="Vocabulary" data={report.vocab_composition} />
        <KeyValues title="Vocabulary reachability" data={report.vocab_reachability} />
        <KeyValues title="Lossy-text breakdown" data={report.lossy_breakdown} />
      </div>
    </div>
  );
}

export function SanityCheckView() {
  const { activeTokenizerId } = useTokenizer();
  const mutation = useMutation({ mutationFn: runSanityCheck });

  if (!activeTokenizerId) {
    return <div className="p-8 text-center text-gray-500">Load a tokenizer to run the sanity check.</div>;
  }

  const report = mutation.data?.tokenizer_id === activeTokenizerId ? mutation.data : undefined;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Sanity Check</h1>
        <p className="text-sm text-gray-500 mt-1">
          The 16 checks of TokEval's{' '}
          <a
            href="https://github.com/cimeister/tokenizer-intrinsic-evals/blob/master/docs/SANITY_CHECKS.md"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            <code>tokenizer-sanity-check</code>
          </a>
          : byte coverage, whitespace and digit handling, special tokens, determinism, Unicode normalization,
          vocabulary integrity and reachability. Runs the tokenizer through its own normalizer and pre-tokenizer
          on the built-in probe corpus. A check that cannot be verified is reported as unverifiable, which
          counts as a warning.
        </p>
      </div>

      <button
        onClick={() => mutation.mutate(activeTokenizerId)}
        disabled={mutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Running checks…' : `Run on ${activeTokenizerId}`}
      </button>

      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}
      {report && <Report report={report} />}
    </div>
  );
}
