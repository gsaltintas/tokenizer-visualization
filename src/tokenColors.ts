import { useMemo, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';

// [background, text, border], all hex
type ColorTriple = [string, string, string];

export interface Palette {
  id: string;
  name: string;
  // categorical: random order; gradient: walk back and forth along the stops
  kind: 'categorical' | 'gradient';
  colors: ColorTriple[];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

// Interpolate hue (and saturation) between two anchors into `steps` light chip colors
function gradient(fromHue: number, toHue: number, sat: number, steps = 9): ColorTriple[] {
  return Array.from({ length: steps }, (_, i) => {
    const h = (fromHue + ((toHue - fromHue) * i) / (steps - 1) + 360) % 360;
    return [hslToHex(h, sat, 86), hslToHex(h, sat, 26), hslToHex(h, sat, 74)];
  });
}

export const PALETTES: Palette[] = [
  {
    id: 'soft',
    name: 'Soft',
    kind: 'categorical',
    colors: [
      ['#cfe3c1', '#2f5a1f', '#b3d19e'], // sage
      ['#c7daf0', '#1f4a7a', '#a7c3e6'], // cornflower
      ['#f3cdb9', '#8a3a1c', '#e8b096'], // terracotta
      ['#f3e0a6', '#6e5500', '#e6cc7a'], // mustard
      ['#e3c9e6', '#63306b', '#d0aad6'], // plum
      ['#bfe3dc', '#1c5c52', '#9dd1c6'], // teal
      ['#d0cff3', '#3b3882', '#b5b3e8'], // periwinkle
      ['#f5c9cf', '#8a2a3a', '#eaa9b3'], // rose
      ['#dfe6b3', '#4f5a12', '#cad68a'], // chartreuse
      ['#f8d9b0', '#7f4a0a', '#efc186'], // apricot
      ['#c4e4f0', '#1b5670', '#a1d1e4'], // sky
      ['#f0cbe2', '#7a2a5c', '#e2a8cc'], // orchid
    ],
  },
  {
    id: 'matte',
    name: 'Matte',
    kind: 'categorical',
    colors: [
      ['#dde5d6', '#3f5234', '#c3d0b8'],
      ['#d6dfe8', '#34495e', '#bccada'],
      ['#ecd9cf', '#7a4130', '#dcc0b1'],
      ['#ece3c8', '#6b5a24', '#dccfa8'],
      ['#e4d8e2', '#5e3f59', '#d0bfcd'],
      ['#d3e3e0', '#2f5550', '#b8d0cb'],
      ['#dcdbea', '#45436b', '#c5c3db'],
      ['#efd9da', '#7a3b43', '#dfc0c3'],
      ['#e2e2cc', '#55562c', '#cfcfae'],
      ['#efdcc3', '#7a5320', '#e0c49f'],
    ],
  },
  {
    id: 'classic',
    name: 'Classic',
    kind: 'categorical',
    colors: [
      ['#dbeafe', '#1e40af', '#bfdbfe'],
      ['#dcfce7', '#166534', '#bbf7d0'],
      ['#fef9c3', '#854d0e', '#fef08a'],
      ['#f3e8ff', '#6b21a8', '#e9d5ff'],
      ['#fce7f3', '#9d174d', '#fbcfe8'],
      ['#e0e7ff', '#3730a3', '#c7d2fe'],
      ['#ffedd5', '#9a3412', '#fed7aa'],
      ['#ccfbf1', '#115e59', '#99f6e4'],
      ['#fee2e2', '#991b1b', '#fecaca'],
      ['#cffafe', '#155e75', '#a5f3fc'],
    ],
  },
  { id: 'sunset', name: 'Sunset', kind: 'gradient', colors: gradient(45, -60, 75) },
  { id: 'ocean', name: 'Ocean', kind: 'gradient', colors: gradient(230, 160, 55) },
  { id: 'forest', name: 'Forest', kind: 'gradient', colors: gradient(150, 60, 45) },
  { id: 'berry', name: 'Berry', kind: 'gradient', colors: gradient(340, 250, 55) },
  { id: 'spectrum', name: 'Spectrum', kind: 'gradient', colors: gradient(0, 300, 65, 12) },
];

const DEFAULT_PALETTE_ID = 'soft';
const STORAGE_KEY = 'tokenizer-explorer:palette';

function readStoredPaletteId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return id && PALETTES.some((p) => p.id === id) ? id : DEFAULT_PALETTE_ID;
  } catch {
    return DEFAULT_PALETTE_ID;
  }
}

// Tiny external store so every chip re-renders when the palette changes
interface ColorState {
  paletteId: string;
  seed: number; // bumped by reshuffle() to get a new random order
}

let state: ColorState = { paletteId: readStoredPaletteId(), seed: 0 };
const listeners = new Set<() => void>();

function emit(next: ColorState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPalette(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage unavailable — choice just won't persist
  }
  emit({ ...state, paletteId: id });
}

export function reshuffle() {
  emit({ ...state, seed: state.seed + 1 });
}

export function useColorState() {
  const s = useSyncExternalStore(subscribe, () => state);
  const palette = PALETTES.find((p) => p.id === s.paletteId) ?? PALETTES[0];
  return { palette, seed: s.seed };
}

// Random order, fixed until reshuffle so re-renders don't flicker.
// Each pick avoids the previous two colors so neighbouring chips stay distinct.
function randomSequence(size: number) {
  const seq: number[] = [];
  return (index: number) => {
    while (seq.length <= index) {
      const recent = seq.slice(-Math.min(2, size - 1));
      let c: number;
      do {
        c = Math.floor(Math.random() * size);
      } while (recent.includes(c));
      seq.push(c);
    }
    return seq[index];
  };
}

// 0,1,…,n-1,n-2,…,1,0,1,… so gradients flow smoothly instead of jumping back to the start
function pingPong(size: number) {
  const period = Math.max(1, 2 * (size - 1));
  return (index: number) => {
    const p = index % period;
    return p < size ? p : period - p;
  };
}

function makeStyler(palette: Palette) {
  const pick = palette.kind === 'gradient' ? pingPong(palette.colors.length) : randomSequence(palette.colors.length);
  return (index: number) => palette.colors[pick(index)];
}

// Stylers are cached per palette+seed so every chip in a view shares the same order
const stylerCache = new Map<string, { token: (i: number) => ColorTriple; chunk: (i: number) => ColorTriple }>();

function getStylers(palette: Palette, seed: number) {
  const key = `${palette.id}:${seed}`;
  let s = stylerCache.get(key);
  if (!s) {
    s = { token: makeStyler(palette), chunk: makeStyler(palette) };
    stylerCache.set(key, s);
  }
  return s;
}

export function useTokenColors() {
  const { palette, seed } = useColorState();
  return useMemo(() => {
    const s = getStylers(palette, seed);
    return {
      tokenStyle(index: number): CSSProperties {
        const [backgroundColor, color, borderColor] = s.token(index);
        return { backgroundColor, color, borderColor };
      },
      chunkStyle(index: number): CSSProperties {
        // Chunks wrap token chips, so give them a stronger border to stand apart
        const [backgroundColor, color] = s.chunk(index);
        return { backgroundColor, color, borderColor: color + '66' };
      },
    };
  }, [palette, seed]);
}
