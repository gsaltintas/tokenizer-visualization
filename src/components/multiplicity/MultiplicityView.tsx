import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMultiplicity, searchMultiplicity } from '../../api/client';
import { useTokenizer } from '../../hooks/useTokenizer';
import type { MultiplicityGroup } from '../../types';

interface CaptureOpts {
  includeLabel: boolean;
  label: string;
  fontSizePx: number;
}

async function captureCard(
  cardEl: HTMLElement,
  opts: CaptureOpts,
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas-pro')).default;
  const scale = 4;
  const { includeLabel, label, fontSizePx } = opts;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position: fixed; left: -9999px; top: 0;';
  const clone = cardEl.cloneNode(true) as HTMLElement;
  // Apply custom font size
  if (fontSizePx !== 14) {
    const ratio = fontSizePx / 14;
    clone.style.fontSize = `${fontSizePx}px`;
    clone.querySelectorAll<HTMLElement>('span, div, h3').forEach((el) => {
      const computed = window.getComputedStyle(el);
      const origSize = parseFloat(computed.fontSize);
      el.style.fontSize = `${Math.round(origSize * ratio)}px`;
    });
  }
  // Hide the Copy PNG button in the export
  clone.querySelectorAll('button').forEach((btn) => btn.remove());
  // Limit variants to 8 per row using CSS grid
  const variantsContainer = clone.querySelector('.flex.flex-wrap.gap-2') as HTMLElement | null;
  if (variantsContainer) {
    variantsContainer.style.display = 'grid';
    variantsContainer.style.gridTemplateColumns = 'repeat(8, auto)';
    variantsContainer.style.gap = '8px';
  }
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  let cardCanvas: HTMLCanvasElement;
  try {
    cardCanvas = await html2canvas(clone, { scale, backgroundColor: null });
  } finally {
    document.body.removeChild(wrapper);
  }

  if (!includeLabel) return cardCanvas;

  const pad = 8 * scale;
  const labelFontSize = Math.round(fontSizePx * 0.9) * scale;
  const labelGap = 4 * scale;

  const out = document.createElement('canvas');
  out.width = cardCanvas.width + pad * 2;
  out.height = cardCanvas.height + pad * 2 + labelFontSize + labelGap;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#374151';
  ctx.font = `600 ${labelFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(label, pad, pad + labelFontSize);
  ctx.drawImage(cardCanvas, pad, pad + labelFontSize + labelGap);
  return out;
}

interface VariantCardProps {
  group: MultiplicityGroup;
  captureOpts: CaptureOpts;
}

function VariantCard({ group, captureOpts }: VariantCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const copyPng = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const canvas = await captureCard(el, captureOpts);
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
  }, [captureOpts]);

  return (
    <div ref={cardRef} className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono font-bold text-gray-900">{JSON.stringify(group.base_form)}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{group.count} variants</span>
          <button
            onClick={copyPng}
            disabled={exporting}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 transition-colors disabled:opacity-50"
          >
            Copy PNG
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {group.variants.map((v) => (
          <div
            key={v.token_id}
            className="px-2 py-1 rounded border text-sm font-mono bg-gray-50"
          >
            <span>{JSON.stringify(v.token_str)}</span>
            <div className="flex gap-1 mt-1">
              {v.has_space_prefix && (
                <span className="text-xs px-1 bg-blue-100 text-blue-700 rounded">space</span>
              )}
              <span className={`text-xs px-1 rounded ${
                v.casing === 'upper' ? 'bg-red-100 text-red-700' :
                v.casing === 'title' ? 'bg-yellow-100 text-yellow-700' :
                v.casing === 'mixed' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {v.casing}
              </span>
              {v.has_punctuation && (
                <span className="text-xs px-1 bg-orange-100 text-orange-700 rounded">punct</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">ID: {v.token_id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MultiplicityView() {
  const { activeTokenizerId } = useTokenizer();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [includeLabel, setIncludeLabel] = useState(false);
  const [fontSizePx, setFontSizePx] = useState(28);

  const captureOpts: CaptureOpts = {
    includeLabel,
    label: activeTokenizerId ?? '',
    fontSizePx,
  };

  const { data: browseData, isLoading: browseLoading } = useQuery({
    queryKey: ['multiplicity', activeTokenizerId, page],
    queryFn: () => getMultiplicity(activeTokenizerId!, page, 20),
    enabled: !!activeTokenizerId && !searchQuery,
  });

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['multiplicitySearch', activeTokenizerId, searchQuery],
    queryFn: () => searchMultiplicity(activeTokenizerId!, searchQuery),
    enabled: !!activeTokenizerId && searchQuery.length > 0,
  });

  const data = searchQuery ? searchData : browseData;
  const isLoading = searchQuery ? searchLoading : browseLoading;

  if (!activeTokenizerId) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Multiplicity Explorer</h2>
        <p className="text-gray-500">Load a tokenizer to explore token variants.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Multiplicity Explorer</h2>
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
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Explore groups of tokens that share the same base form but differ in casing, spacing, or punctuation.
      </p>

      <div className="mb-4">
        <input
          className="w-full max-w-md px-3 py-2 border rounded-lg text-sm"
          placeholder="Search by base form (e.g., 'the', 'hello')..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
        />
      </div>

      {data && (
        <p className="text-sm text-gray-500 mb-4">
          {data.total_groups.toLocaleString()} groups found
        </p>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : data ? (
        <div className="space-y-4">
          {data.groups.map((group) => (
            <VariantCard key={group.base_form} group={group} captureOpts={captureOpts} />
          ))}

          {!searchQuery && data.total_groups > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-500">
                Page {page} of {Math.ceil(data.total_groups / 20)}
              </span>
              <button
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={page >= Math.ceil(data.total_groups / 20)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
