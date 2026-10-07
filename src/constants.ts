export const PRESET_TOKENIZERS = [
  'gpt-4o',
  'cl100k_base',
  'gpt2',
  'google/gemma-2-2b',
  'english-32000-consistent-v1',
  'meta-llama/Llama-3.2-1B',
  'Qwen/Qwen3-8B',
];

// Concrete font names for PNG/PDF exports: html2canvas draws text onto a canvas, where generic
// keywords like ui-monospace/system-ui may not resolve and the browser falls back to Times.
export const EXPORT_FONT_FAMILY = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';
