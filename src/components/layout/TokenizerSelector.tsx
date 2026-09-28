import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { loadTokenizer, reloadTokenizer } from '../../api/client';
import { splitTokenizerId, useTokenizer } from '../../hooks/useTokenizer';
import { PRESET_TOKENIZERS } from '../../constants';

export function TokenizerSelector() {
  const {
    activeTokenizerId,
    setActiveTokenizer,
    loadedTokenizers,
    addLoadedTokenizer,
    removeLoadedTokenizer,
  } = useTokenizer();
  const [inputValue, setInputValue] = useState('');
  const [subfolderValue, setSubfolderValue] = useState('');

  const loadMutation = useMutation({
    mutationFn: ({ name, subfolder }: { name: string; subfolder?: string }) =>
      loadTokenizer(name, subfolder),
    onSuccess: (tok) => {
      addLoadedTokenizer(tok);
      setActiveTokenizer(tok.id);
      setInputValue('');
      setSubfolderValue('');
    },
  });

  // The backend cache is shared and LRU-evicted, so re-load before activating a
  // tokenizer from this browser's list (a no-op if it's still cached).
  const selectTokenizer = (id: string) => {
    if (!id) return setActiveTokenizer(null);
    const [name, subfolder] = splitTokenizerId(id);
    loadMutation.mutate({ name, subfolder });
  };

  const reloadMutation = useMutation({
    mutationFn: reloadTokenizer,
    onSuccess: addLoadedTokenizer,
  });

  const handleLoad = () => {
    const name = inputValue.trim();
    if (name) {
      const subfolder = subfolderValue.trim() || undefined;
      loadMutation.mutate({ name, subfolder });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Active Tokenizer</label>
          {activeTokenizerId && (
            <div className="flex gap-2">
              <button
                onClick={() => reloadMutation.mutate(activeTokenizerId)}
                disabled={reloadMutation.isPending}
                title="Reload tokenizer"
                className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-40"
              >
                {reloadMutation.isPending ? '...' : '↻ reload'}
              </button>
              <button
                onClick={() => removeLoadedTokenizer(activeTokenizerId)}
                title="Remove from your list"
                className="text-xs text-gray-400 hover:text-red-600"
              >
                ✕ remove
              </button>
            </div>
          )}
        </div>
        {loadedTokenizers.length > 0 ? (
          <select
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            value={activeTokenizerId || ''}
            onChange={(e) => selectTokenizer(e.target.value)}
          >
            <option value="">Select...</option>
            {loadedTokenizers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.source}, {t.vocab_size.toLocaleString()} tokens)
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-gray-500">No tokenizers loaded yet.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Load Tokenizer</label>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
            placeholder="e.g. gpt-4o, cl100k_base, meta-llama/..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50"
            onClick={handleLoad}
            disabled={loadMutation.isPending || !inputValue.trim()}
          >
            {loadMutation.isPending ? 'Loading...' : 'Load'}
          </button>
        </div>
        <input
          className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm text-gray-600"
          placeholder="Subfolder (optional, e.g. models/my-bpe)"
          value={subfolderValue}
          onChange={(e) => setSubfolderValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
        />
        {loadMutation.isError && (
          <p className="text-sm text-red-500 mt-1">{(loadMutation.error as Error).message}</p>
        )}
      </div>

      <div className="text-xs text-gray-500">
        <p className="font-medium mb-1">Presets:</p>
        <div className="flex flex-wrap gap-1">
          {PRESET_TOKENIZERS.map((name) => (
            <button
              key={name}
              className="px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
              onClick={() => {
                setInputValue(name);
                loadMutation.mutate({ name });
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
