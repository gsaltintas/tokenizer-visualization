export const PRESET_TOKENIZERS = [
  'gpt-4o',
  'cl100k_base',
  'gpt2',
  'google/gemma-2-2b',
  'english-32000-consistent-v1',
  'meta-llama/Llama-3.2-1B',
  'Qwen/Qwen3-8B',
];

// script_tok tokenizers (https://github.com/sanderland/script_tok) from "Explicit Boundary Markers
// for Subword Vocabularies"; mirrors SCRIPT_TOK_PRESETS in the backend's registry.py.
const SCRIPT_TOK_REPO_PREFIX = 'script_tok:cmeister/boundary-markers-';
export const SCRIPT_TOK_PRESETS = ['en', 'ko', 'ru'].flatMap((lang) =>
  ['bpe', 'mingram'].map((model) => `${SCRIPT_TOK_REPO_PREFIX}${lang}-d12-plain-${model}`),
);

// Short button label for a script_tok preset, e.g. "en-d12-plain-bpe".
export const scriptTokLabel = (name: string) => name.replace(SCRIPT_TOK_REPO_PREFIX, '');

// Concrete font names for PNG/PDF exports: html2canvas draws text onto a canvas, where generic
// keywords like ui-monospace/system-ui may not resolve and the browser falls back to Times.
export const EXPORT_FONT_FAMILY = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';
