import { useState, useRef, useEffect } from 'react';
import { PALETTES, setPalette, reshuffle, useColorState } from '../../tokenColors';
import type { Palette } from '../../tokenColors';

function Swatches({ palette }: { palette: Palette }) {
  // Gradients read best as a continuous strip; categorical palettes as separate dots
  if (palette.kind === 'gradient') {
    const stops = palette.colors.map((c) => c[2]).join(', ');
    return <span className="inline-block w-20 h-3 rounded-sm" style={{ background: `linear-gradient(to right, ${stops})` }} />;
  }
  return (
    <span className="inline-flex gap-0.5">
      {palette.colors.slice(0, 8).map((c, i) => (
        <span key={i} className="inline-block w-2.5 h-3 rounded-sm border" style={{ backgroundColor: c[0], borderColor: c[2] }} />
      ))}
    </span>
  );
}

export function PalettePicker() {
  const { palette } = useColorState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const renderGroup = (kind: Palette['kind'], label: string) => (
    <div className="py-1">
      <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      {PALETTES.filter((p) => p.kind === kind).map((p) => (
        <button
          key={p.id}
          onClick={() => {
            setPalette(p.id);
            setOpen(false);
          }}
          className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-left hover:bg-gray-50 ${
            p.id === palette.id ? 'font-semibold text-gray-900' : 'text-gray-700'
          }`}
        >
          <span>{p.name}</span>
          <Swatches palette={p} />
        </button>
      ))}
    </div>
  );

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Choose token color palette"
        className="flex items-center gap-2 px-3 py-1 text-xs bg-white hover:bg-gray-100 text-gray-700 rounded border border-gray-200 shadow-sm transition-colors"
      >
        <Swatches palette={palette} />
        <span>{palette.name}</span>
      </button>
      {palette.kind === 'categorical' && (
        <button
          onClick={reshuffle}
          title="Shuffle token colors"
          className="px-2 py-1 text-xs bg-white hover:bg-gray-100 text-gray-700 rounded border border-gray-200 shadow-sm transition-colors"
        >
          ⤮
        </button>
      )}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white rounded-lg border border-gray-200 shadow-lg divide-y divide-gray-100">
          {renderGroup('categorical', 'Palettes')}
          {renderGroup('gradient', 'Gradients')}
        </div>
      )}
    </div>
  );
}
