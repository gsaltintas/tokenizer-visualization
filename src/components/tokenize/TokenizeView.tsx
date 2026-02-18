import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tokenizeText } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import { TokenChip } from '../shared/TokenChip';

// Fixed CSS width for all exports so fonts are uniform across tokenizers.
const EXPORT_WIDTH_PX = 720;

interface CaptureOpts {
  includeLabel: boolean;
  label: string;
  tight: boolean;
  fontSizePx: number;
}

async function captureChips(
  chipsEl: HTMLElement,
  opts: CaptureOpts,
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas-pro')).default;
  const scale = 4;
  const { includeLabel, label, tight, fontSizePx } = opts;

  // Clone into an offscreen container.
  // tight = inline-flex (shrink-to-content), otherwise fixed width for uniform sizing.
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    ${tight ? '' : `width: ${EXPORT_WIDTH_PX}px;`}
  `;
  const clone = chipsEl.cloneNode(true) as HTMLElement;
  clone.style.display = tight ? 'inline-flex' : 'flex';
  // Apply custom font size to all chip elements inside the clone
  if (fontSizePx !== 14) {
    const ratio = fontSizePx / 14; // 14px is the default text-sm
    clone.style.fontSize = `${fontSizePx}px`;
    clone.style.gap = `${Math.round(2 * ratio)}px`;
    clone.querySelectorAll('span').forEach((span) => {
      span.style.fontSize = `${fontSizePx}px`;
      const px = Math.max(1, Math.round(4 * ratio));
      span.style.paddingLeft = `${px}px`;
      span.style.paddingRight = `${px}px`;
      span.style.paddingTop = `${Math.round(2 * ratio)}px`;
      span.style.paddingBottom = `${Math.round(2 * ratio)}px`;
    });
  }
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  let chipsCanvas: HTMLCanvasElement;
  try {
    chipsCanvas = await html2canvas(clone, { scale, backgroundColor: null });
  } finally {
    document.body.removeChild(wrapper);
  }

  if (!includeLabel) return chipsCanvas;

  // Build a new canvas with the label above the chips (transparent background)
  const pad = 8 * scale;
  const labelFontSize = Math.round(fontSizePx * 0.9) * scale;
  const labelGap = 4 * scale;

  const out = document.createElement('canvas');
  out.width = Math.max(chipsCanvas.width, tight ? 0 : EXPORT_WIDTH_PX * scale) + pad * 2;
  out.height = chipsCanvas.height + pad * 2 + labelFontSize + labelGap;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#374151';
  ctx.font = `600 ${labelFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(label, pad, pad + labelFontSize);
  ctx.drawImage(chipsCanvas, pad, pad + labelFontSize + labelGap);
  return out;
}

export function TokenizeView() {
  const { activeTokenizerId } = useTokenizer();
  const [text, setText] = useState('The quick brown fox jumps over the lazy dog.');
  const [debouncedText, setDebouncedText] = useState(text);
  const [includeLabel, setIncludeLabel] = useState(false);
  const [tight, setTight] = useState(false);
  const [fontSizePx, setFontSizePx] = useState(28);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(text), 200);
    return () => clearTimeout(timer);
  }, [text]);

  const chipsRef = useRef<HTMLDivElement>(null);

  const getCanvas = useCallback(async () => {
    const el = chipsRef.current;
    if (!el) return null;
    return captureChips(el, {
      includeLabel,
      label: activeTokenizerId ?? '',
      tight,
      fontSizePx,
    });
  }, [includeLabel, activeTokenizerId, tight, fontSizePx]);

  const exportToPdf = useCallback(async () => {
    setExporting(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const { jsPDF } = await import('jspdf');

      const scale = 4;
      const pxToMm = 25.4 / 96 / scale;
      const pdfW = canvas.width * pxToMm;
      const pdfH = canvas.height * pxToMm;

      const pdf = new jsPDF({
        orientation: pdfW > pdfH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfW, pdfH],
      });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH);
      pdf.save('tokens.pdf');
    } finally {
      setExporting(false);
    }
  }, [getCanvas]);

  const copyPng = useCallback(async () => {
    setExporting(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
      }
    } finally {
      setExporting(false);
    }
  }, [getCanvas]);

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
            <div className="flex items-center justify-between mb-2 flex-wrap gap-y-2">
              <h3 className="text-sm font-medium text-gray-700">Tokens</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeLabel}
                    onChange={(e) => setIncludeLabel(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Name
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tight}
                    onChange={(e) => setTight(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Tight
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-500 select-none">
                  <span>Size</span>
                  <input
                    type="number"
                    min={8}
                    max={48}
                    value={fontSizePx}
                    onChange={(e) => setFontSizePx(Math.max(8, Math.min(48, Number(e.target.value) || 14)))}
                    className="w-12 px-1 py-0.5 text-xs border rounded border-gray-300 text-center"
                  />
                  <span>px</span>
                </label>
                <button
                  onClick={copyPng}
                  disabled={exporting}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 transition-colors disabled:opacity-50"
                >
                  Copy PNG
                </button>
                <button
                  onClick={exportToPdf}
                  disabled={exporting}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 transition-colors disabled:opacity-50"
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div ref={chipsRef} className="inline-flex flex-wrap gap-0.5 leading-relaxed">
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
