import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { loadTokenizer } from '../api/client';
import { useTokenizer } from './useTokenizer';

// Backend tokenizer ids are `name` or `name::subfolder` (see registry._cache_key).
function splitTokenizerId(id: string): [string, string | undefined] {
  const idx = id.indexOf('::');
  return idx === -1 ? [id, undefined] : [id.slice(0, idx), id.slice(idx + 2)];
}

/**
 * Keeps the active tokenizer in the `?tok=` URL param so any view can be shared.
 * Opening a link with `?tok=` loads that tokenizer on the backend (it may not be
 * cached yet) and activates it.
 */
export function TokenizerUrlSync() {
  const { activeTokenizerId, setActiveTokenizer } = useTokenizer();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlTok = searchParams.get('tok');
  const latestUrlTok = useRef(urlTok);
  latestUrlTok.current = urlTok;
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // URL -> state (shared link, back/forward)
  useEffect(() => {
    if (!urlTok || urlTok === activeTokenizerId) return;
    const [name, subfolder] = splitTokenizerId(urlTok);
    setLoading(urlTok);
    setError(null);
    loadTokenizer(name, subfolder)
      .then((tok) => {
        if (latestUrlTok.current !== urlTok) return;
        setActiveTokenizer(tok.id);
        queryClient.invalidateQueries({ queryKey: ['tokenizers'] });
      })
      .catch((e: Error) => {
        if (latestUrlTok.current === urlTok) setError(`Could not load "${urlTok}": ${e.message}`);
      })
      .finally(() => setLoading((cur) => (cur === urlTok ? null : cur)));
    // Only react to URL changes; state changes are pushed to the URL below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTok]);

  // state -> URL (selector change, or navigation that dropped the param)
  const prevActive = useRef(activeTokenizerId);
  useEffect(() => {
    const changed = prevActive.current !== activeTokenizerId;
    prevActive.current = activeTokenizerId;
    if (!activeTokenizerId || location.pathname === '/' || urlTok === activeTokenizerId) return;
    if (!changed && urlTok) return; // URL points elsewhere and is being loaded above
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tok', activeTokenizerId);
        return next;
      },
      { replace: true },
    );
  }, [activeTokenizerId, urlTok, location.pathname, setSearchParams]);

  if (!loading && !error) return null;
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm px-4 py-2 rounded-lg shadow text-sm ${
        error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-gray-700 border'
      }`}
    >
      {error ?? `Loading tokenizer ${loading} from link…`}
      {error && (
        <button className="ml-3 text-xs underline" onClick={() => setError(null)}>
          dismiss
        </button>
      )}
    </div>
  );
}
