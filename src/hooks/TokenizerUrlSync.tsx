import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { loadTokenizer } from '../api/client';
import { splitTokenizerId, useTokenizer } from './useTokenizer';

function ensureLoaded(id: string) {
  const [name, subfolder] = splitTokenizerId(id);
  return loadTokenizer(name, subfolder);
}

/**
 * Keeps the active tokenizer (`?tok=`) and, on Merge Tree, the comparison selection
 * (`?cmp=a&cmp=b`) in the URL so views can be shared. Opening a link loads those tokenizers on
 * the backend (they may not be cached yet) and adds them to this browser's list.
 */
export function TokenizerUrlSync() {
  const {
    activeTokenizerId,
    setActiveTokenizer,
    comparisonIds,
    setComparisonIds,
    addLoadedTokenizer,
  } = useTokenizer();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Comparison selection is only part of the link on views that use exactly it
  const cmpInUrl = location.pathname === '/merge-tree';
  const urlTok = searchParams.get('tok');
  const urlCmp = searchParams.getAll('cmp');
  // Joined keys so effects can depend on array contents
  const urlCmpKey = urlCmp.join('\n');
  const stateCmpKey = comparisonIds.join('\n');

  const latestUrlTok = useRef(urlTok);
  latestUrlTok.current = urlTok;
  const latestUrlCmpKey = useRef(urlCmpKey);
  latestUrlCmpKey.current = urlCmpKey;

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL -> state: active tokenizer (shared link, back/forward)
  useEffect(() => {
    if (!urlTok || urlTok === activeTokenizerId) return;
    setLoading(urlTok);
    setError(null);
    ensureLoaded(urlTok)
      .then((tok) => {
        if (latestUrlTok.current !== urlTok) return;
        addLoadedTokenizer(tok);
        setActiveTokenizer(tok.id);
      })
      .catch((e: Error) => {
        if (latestUrlTok.current === urlTok) setError(`Could not load "${urlTok}": ${e.message}`);
      })
      .finally(() => setLoading((cur) => (cur === urlTok ? null : cur)));
    // Only react to URL changes; state changes are pushed to the URL below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTok]);

  // URL -> state: comparison selection
  useEffect(() => {
    if (!cmpInUrl || !urlCmpKey || urlCmpKey === stateCmpKey) return;
    const ids = urlCmpKey.split('\n');
    const label = ids.join(', ');
    setLoading(label);
    setError(null);
    Promise.all(ids.map(ensureLoaded))
      .then((toks) => {
        if (latestUrlCmpKey.current !== urlCmpKey) return;
        toks.forEach(addLoadedTokenizer);
        setComparisonIds(toks.map((t) => t.id));
      })
      .catch((e: Error) => {
        if (latestUrlCmpKey.current === urlCmpKey) setError(`Could not load comparison tokenizers: ${e.message}`);
      })
      .finally(() => setLoading((cur) => (cur === label ? null : cur)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCmpKey]);

  // state -> URL (selector/checkbox change, or navigation that dropped the params)
  const prevActive = useRef(activeTokenizerId);
  const prevCmpKey = useRef(stateCmpKey);
  useEffect(() => {
    const tokChanged = prevActive.current !== activeTokenizerId;
    const cmpChanged = prevCmpKey.current !== stateCmpKey;
    prevActive.current = activeTokenizerId;
    prevCmpKey.current = stateCmpKey;
    if (location.pathname === '/') return;

    // Write state to the URL when it changed, or when the URL lost the param.
    // Otherwise the URL points elsewhere and is being loaded above.
    let writeTok = false;
    if (urlTok !== activeTokenizerId) {
      writeTok = activeTokenizerId ? tokChanged || !urlTok : tokChanged && !!urlTok;
    }
    const writeCmp = cmpInUrl && urlCmpKey !== stateCmpKey && (cmpChanged || !urlCmpKey);
    const stripCmp = !cmpInUrl && !!urlCmpKey;
    if (!writeTok && !writeCmp && !stripCmp) return;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (writeTok) {
          if (activeTokenizerId) next.set('tok', activeTokenizerId);
          else next.delete('tok');
        }
        if (writeCmp || stripCmp) next.delete('cmp');
        if (writeCmp) comparisonIds.forEach((id) => next.append('cmp', id));
        return next;
      },
      { replace: true },
    );
    // comparisonIds is covered by stateCmpKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTokenizerId, stateCmpKey, urlTok, urlCmpKey, location.pathname, setSearchParams]);

  if (!loading && !error) return null;
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm px-4 py-2 rounded-lg shadow text-sm ${
        error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-gray-700 border'
      }`}
    >
      {error ?? `Loading ${loading} from link…`}
      {error && (
        <button className="ml-3 text-xs underline" onClick={() => setError(null)}>
          dismiss
        </button>
      )}
    </div>
  );
}
