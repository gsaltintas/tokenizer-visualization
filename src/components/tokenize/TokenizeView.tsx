import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tokenizeText } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { TokenChip } from '../shared/TokenChip';

export function TokenizeView() {
  const { activeTokenizerId } = useTokenizer();
  const [text, setText] = useState('The quick brown fox jumps over the lazy dog.');
  const [debouncedText, setDebouncedText] = useState(text);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(text), 200);
    return () => clearTimeout(timer);
  }, [text]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tokenize', activeTokenizerId, debouncedText],
    queryFn: () => tokenizeText(activeTokenizerId!, debouncedText),
    enabled: !!activeTokenizerId && debouncedText.length > 0,
  });

  if (!activeTokenizerId) {
    return (
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tokenize</h2>
        <p className="text-gray-500">Load a tokenizer from the sidebar to get started.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Tokenize</h2>

      <textarea
        className="w-full h-40 px-4 py-3 border rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to tokenize..."
      />

      {data && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Tokens: <strong>{data.token_count}</strong></span>
            <span>Characters: <strong>{data.char_count}</strong></span>
            <span>Ratio: <strong>{(data.token_count / Math.max(data.char_count, 1)).toFixed(2)}</strong> tokens/char</span>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tokens</h3>
            <div className="flex flex-wrap gap-0.5 leading-relaxed">
              {data.tokens.map((token, i) => (
                <TokenChip key={i} token={token} index={i} />
              ))}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Token IDs</h3>
            <div className="flex flex-wrap gap-1">
              {data.tokens.map((token, i) => (
                <TokenChip key={i} token={token} index={i} showId />
              ))}
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border overflow-x-auto">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Token Details</h3>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Token</th>
                  <th className="px-2 py-1">ID</th>
                  <th className="px-2 py-1">Bytes</th>
                  <th className="px-2 py-1">Hex</th>
                </tr>
              </thead>
              <tbody>
                {data.tokens.map((token, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-2 py-1 text-gray-400">{i}</td>
                    <td className="px-2 py-1">
                      <span className={`px-1 rounded ${['bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50', 'bg-pink-50'][i % 5]}`}>
                        {JSON.stringify(token.token_str)}
                      </span>
                    </td>
                    <td className="px-2 py-1">{token.id}</td>
                    <td className="px-2 py-1">{token.byte_length}</td>
                    <td className="px-2 py-1 text-gray-500">{token.token_bytes_hex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isLoading && <p className="mt-4 text-gray-500">Tokenizing...</p>}
      {error && <p className="mt-4 text-red-500">{(error as Error).message}</p>}
    </div>
  );
}
