import type { CSSProperties } from 'react';

// Muted, low-saturation palette: [background, text, border]
const MATTE_PALETTE: [string, string, string][] = [
  ['#dde5d6', '#3f5234', '#c3d0b8'], // sage
  ['#d6dfe8', '#34495e', '#bccada'], // dusty blue
  ['#ecd9cf', '#7a4130', '#dcc0b1'], // clay
  ['#ece3c8', '#6b5a24', '#dccfa8'], // sand
  ['#e4d8e2', '#5e3f59', '#d0bfcd'], // mauve
  ['#d3e3e0', '#2f5550', '#b8d0cb'], // slate teal
  ['#dcdbea', '#45436b', '#c5c3db'], // lavender gray
  ['#efd9da', '#7a3b43', '#dfc0c3'], // dusty rose
  ['#e2e2cc', '#55562c', '#cfcfae'], // olive
  ['#e3ddd5', '#564b40', '#cfc6ba'], // taupe
  ['#efdcc3', '#7a5320', '#e0c49f'], // ochre
  ['#d9e0e3', '#3c4f58', '#c2ced3'], // steel
];

// Random color sequence, fixed for the page load so re-renders don't flicker.
// Each pick avoids the previous two colors so neighbouring chips stay distinct.
function makeColorSequence() {
  const seq: number[] = [];
  return (index: number) => {
    while (seq.length <= index) {
      const recent = seq.slice(-2);
      let c: number;
      do {
        c = Math.floor(Math.random() * MATTE_PALETTE.length);
      } while (recent.includes(c));
      seq.push(c);
    }
    return MATTE_PALETTE[seq[index]];
  };
}

const tokenSequence = makeColorSequence();
const chunkSequence = makeColorSequence();

export function tokenColorStyle(index: number): CSSProperties {
  const [backgroundColor, color, borderColor] = tokenSequence(index);
  return { backgroundColor, color, borderColor };
}

export function chunkColorStyle(index: number): CSSProperties {
  // Chunks wrap token chips, so give them a stronger border to stand apart
  const [backgroundColor, color] = chunkSequence(index);
  return { backgroundColor, color, borderColor: color + '66' };
}

export const PRESET_TOKENIZERS = [
  'gpt-4o',
  'cl100k_base',
  'gpt2',
  'google/gemma-2-2b',
  'english-32000-consistent-v1',
  'meta-llama/Llama-3.2-1B',
  'Qwen/QWen3-8B',
];
