import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listTokenizers, loadTokenizer } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';

export function TokenizerSelector() {
  const { activeTokenizerId, setActiveTokenizer } = useTokenizer();
  const [inputValue, setInputValue] = useState('');
  const queryClient = useQueryClient();

  const { data: tokenizers = [] } = useQuery({
    queryKey: ['tokenizers'],
    queryFn: listTokenizers,
  });

  const loadMutation = useMutation({
    mutationFn: loadTokenizer,
    onSuccess: (tok) => {
      setActiveTokenizer(tok.id);
      queryClient.invalidateQueries({ queryKey: ['tokenizers'] });
      setInputValue('');
    },
  });

  const handleLoad = () => {
    const name = inputValue.trim();
    if (name) {
      loadMutation.mutate(name);
    }
  };

  const loadedTokenizers = tokenizers.filter((t) => t.vocab_size > 0);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Active Tokenizer</label>
        {loadedTokenizers.length > 0 ? (
          <select
            className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
            value={activeTokenizerId || ''}
            onChange={(e) => setActiveTokenizer(e.target.value)}
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
        {loadMutation.isError && (
          <p className="text-sm text-red-500 mt-1">{(loadMutation.error as Error).message}</p>
        )}
      </div>

      <div className="text-xs text-gray-500">
        <p className="font-medium mb-1">Presets:</p>
        <div className="flex flex-wrap gap-1">
          {['gpt-4o', 'cl100k_base', 'gpt2', 'google/gemma-2-2b'].map((name) => (
            <button
              key={name}
              className="px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
              onClick={() => {
                setInputValue(name);
                loadMutation.mutate(name);
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
