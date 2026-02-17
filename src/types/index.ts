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
