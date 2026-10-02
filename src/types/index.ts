export interface TokenizerInfo {
  id: string;
  name: string;
  tokenizer_type: string;
  vocab_size: number;
  source: string;
}

export interface TokenInfo {
  id: number;
  token_str: string;
  token_bytes_hex: string;
  byte_length: number;
  start?: number;
  end?: number;
  // Tokens whose bytes only decode together share a group_id
  is_partial?: boolean;
  group_id?: number | null;
  group_str?: string | null;
}

export interface TokenizeResponse {
  tokens: TokenInfo[];
  token_count: number;
  char_count: number;
}

export interface VocabEntry {
  id: number;
  token_str: string;
  token_bytes_hex: string;
  byte_length: number;
  script: string;
  morpheme_type: string;
}

export interface VocabResponse {
  entries: VocabEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface VocabStatsResponse {
  vocab_size: number;
  avg_token_length: number;
  max_token_length: number;
  length_distribution: Record<number, number>;
  script_distribution: Record<string, number>;
}

export interface VariantInfo {
  token_id: number;
  token_str: string;
  has_space_prefix: boolean;
  casing: string;
  has_punctuation: boolean;
}

export interface MultiplicityGroup {
  base_form: string;
  variants: VariantInfo[];
  count: number;
}

export interface MultiplicityResponse {
  groups: MultiplicityGroup[];
  total_groups: number;
  page: number;
  page_size: number;
}

export interface ScriptCategory {
  script: string;
  token_count: number;
  percentage: number;
  example_tokens: string[];
}

export interface LanguageCompositionResponse {
  categories: ScriptCategory[];
  total_tokens: number;
  mixed_script_count: number;
}

export interface MorphemeBreakdown {
  token_str: string;
  token_id: number;
  morpheme_type: string;
  morphemes: string[];
}

export interface MorphemeAnalysisResponse {
  breakdowns: MorphemeBreakdown[];
  total: number;
  page: number;
  page_size: number;
  type_distribution: Record<string, number>;
}

export interface UndertrainedToken {
  token_id: number;
  token_str: string;
  token_bytes_hex: string;
  reason: string;
  confidence: number;
  expected_merge_path: string[];
  actual_merge_result: string[];
}

export interface UndertrainedResponse {
  tokens: UndertrainedToken[];
  total: number;
  page: number;
  page_size: number;
  bpe_available: boolean;
}

export interface OverlapResult {
  shared_tokens: number;
  unique_per_tokenizer: Record<string, number>;
  total_union: number;
  overlap_percentage: number;
  shared_sample: string[];
  unique_samples: Record<string, string[]>;
}

export interface TokenizerTokenization {
  tokenizer_id: string;
  tokens: TokenInfo[];
  token_count: number;
}

export interface ComparisonTokenizeResponse {
  results: TokenizerTokenization[];
  text: string;
}

export interface EfficiencyMetric {
  tokenizer_id: string;
  avg_tokens_per_word: number;
  avg_token_length_chars: number;
  total_tokens: number;
  total_chars: number;
}

export interface EfficiencyResponse {
  metrics: EfficiencyMetric[];
}

// Merge Tree

export interface MergeTreeNode {
  token: string;
  rank: number;
  is_leaf: boolean;
  left?: MergeTreeNode;
  right?: MergeTreeNode;
}

export interface MergeStepInfo {
  step: number;
  merged_token: string;
  rank: number;
  tokens_after: string[];
}

export interface MergeTreeTokenizerResult {
  name: string;
  trees: MergeTreeNode[];
  steps: MergeStepInfo[];
  final_tokens: string[];
}

export interface ConflictAnalysis {
  shared_intermediates: string[];
  only_a: string[];
  only_b: string[];
  is_compatible: boolean;
  conflict_count: number;
}

export interface MergeTreeComparisonResponse {
  text: string;
  initial_bytes: string[];
  tokenizer_a: MergeTreeTokenizerResult;
  tokenizer_b: MergeTreeTokenizerResult;
  conflict_analysis: ConflictAnalysis;
}

// Merge Forest

export interface MergeForestEntry {
  token: string;
  token_hex: string;
  rank: number;
  byte_length: number;
  is_leaf: boolean;
  is_root: boolean;
  left: string | null;
  left_hex: string | null;
  left_rank: number | null;
  right: string | null;
  right_hex: string | null;
  right_rank: number | null;
}

export interface MergeForestResponse {
  entries: MergeForestEntry[];
  total: number;
  page: number;
  page_size: number;
  total_leaves: number;
  total_merges: number;
  total_roots: number;
}

export interface MergeForestSubtreeNode {
  token: string;
  token_hex: string;
  rank: number;
  is_leaf: boolean;
  left?: MergeForestSubtreeNode;
  right?: MergeForestSubtreeNode;
}

export interface MergeForestSubtreeResponse {
  root: MergeForestSubtreeNode;
  depth: number;
  node_count: number;
}

export interface MergeForestTreeInfo {
  root: MergeForestSubtreeNode;
  depth: number;
  node_count: number;
  byte_length: number;
}

export interface MergeForestTreesResponse {
  trees: MergeForestTreeInfo[];
  total: number;
  page: number;
  page_size: number;
  total_leaves: number;
  total_merges: number;
  total_roots: number;
}

// Pretokenize
export interface NormalizationInfo {
  type: string;
  normalized_text: string;
  changed: boolean;
}

export interface PretokenizeResponse {
  normalization: NormalizationInfo;
  chunks: string[];
  chunk_spans: [number, number][];
  chunk_count: number;
  pretokenizer_type: string;
  pretokenizer_description: string;
  regex_pattern: string | null;
}

// Intrinsic Eval
export interface PerTextMetrics {
  n_tokens: number;
  n_words: number;
  n_bytes: number;
  n_chars: number;
  fertility_words: number | null;
  bytes_per_token: number | null;
  chars_per_token: number | null;
  tokens_per_byte: number | null;
  integrity_rate: number | null;
  boundary_crossing_rate: number | null;
  byte_fallback_rate: number | null;
}

export interface PerTextResponse {
  tokenizer_id: string;
  metrics: PerTextMetrics;
}

export interface FloresLanguage {
  code: string;
  name: string;
  script: string;
}

export interface PerLanguageResult {
  code: string;
  name?: string;
  n_texts?: number;
  n_tokens?: number;
  n_bytes?: number;
  n_words?: number;
  fertility: number | null;
  tokens_per_byte: number | null;
  integrity_rate: number | null;
  error?: string;
}

export interface FloresEvalResponse {
  tokenizer_id: string;
  gini: number | null;
  n_languages: number;
  per_language: PerLanguageResult[];
}

// Token-boundary visualization (TokEval tokenizer-visualize)
export interface VisualizeSample {
  label: string;
  text: string;
}

export interface VisualizeToken {
  id: number;
  raw: string;
  text?: string;
  start?: number;
  end?: number;
  special: boolean;
}

export interface VisualizeSegment {
  text: string;
  token: number | null;
  // >1 when each character in this run is split across that many byte-tokens, else 0
  split: number;
}

export interface VisualizeStats {
  whitespace_tokens: number;
  newline_tokens: number;
  newline_indent_tokens: number;
  indentation_tokens: number;
  special_tokens: number;
  split_chars: number;
  hidden_tokens: number;
  indent_patterns: { spaces_per_token: number[]; count: number }[];
  tokens_per_indent_depth: { depth: number; avg_tokens: number }[];
}

export interface VisualizeResult {
  tokenizer_id: string;
  name?: string;
  error?: string;
  n_tokens?: number;
  has_offsets?: boolean;
  tokens?: VisualizeToken[];
  segments?: VisualizeSegment[] | null;
  stats?: VisualizeStats | null;
}

// Sanity check (TokEval tokenizer-sanity-check)
export type Severity = 'pass' | 'warn' | 'fail' | 'not_applicable' | 'unverifiable';

export interface SanityCheck {
  name: string;
  category: string;
  severity: Severity;
  observed: unknown;
  threshold: unknown;
  detail: string;
  rationale: string;
  examples: unknown[];
}

export interface SanityReport {
  tokenizer_id: string;
  overall_severity: 'pass' | 'warn' | 'fail';
  exit_code: number;
  n_fail: number;
  n_warn: number;
  checks: SanityCheck[];
  lossy_breakdown: Record<string, unknown>;
  vocab_reachability: Record<string, unknown>;
  vocab_composition: Record<string, unknown>;
  components: Record<string, unknown>;
  warnings: string[];
}
