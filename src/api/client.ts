import type {
  ComparisonTokenizeResponse,
  EfficiencyResponse,
  LanguageCompositionResponse,
  MergeTreeComparisonResponse,
  MorphemeAnalysisResponse,
  MultiplicityResponse,
  OverlapResult,
  TokenizerInfo,
  TokenizeResponse,
  UndertrainedResponse,
  VocabResponse,
  VocabStatsResponse,
} from '../types';

const BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';


async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Tokenizer management
export async function listTokenizers(): Promise<TokenizerInfo[]> {
  const data = await fetchJSON<{ tokenizers: TokenizerInfo[] }>(`${BASE}/tokenizers`);
  return data.tokenizers;
}

export async function loadTokenizer(name: string): Promise<TokenizerInfo> {
  const data = await fetchJSON<{ tokenizer: TokenizerInfo }>(`${BASE}/tokenizers/load`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return data.tokenizer;
}

// Tokenization
export async function tokenizeText(tokenizerId: string, text: string): Promise<TokenizeResponse> {
  return fetchJSON<TokenizeResponse>(`${BASE}/tokenize`, {
    method: 'POST',
    body: JSON.stringify({ tokenizer_id: tokenizerId, text }),
  });
}

// Vocabulary
export async function getVocab(
  tokId: string,
  page = 1,
  pageSize = 100,
  search = '',
  sortBy = 'id',
  sortDir: 'asc' | 'desc' = 'asc'
): Promise<VocabResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  if (search) params.set('search', search);
  return fetchJSON<VocabResponse>(`${BASE}/vocab/${tokId}?${params}`);
}

export async function getVocabStats(tokId: string): Promise<VocabStatsResponse> {
  return fetchJSON<VocabStatsResponse>(`${BASE}/vocab/stats/${tokId}`);
}

// Multiplicity
// export async function searchMultiplicity(
//   tokId: string,
//   query: string
// ): Promise<MultiplicityResponse> {
//   const params = new URLSearchParams({ query });
//   return fetchJSON<MultiplicityResponse>(
//     `${BASE}/multiplicity/search/${encodeURIComponent(tokId)}?${params}`
//   );
// }
export async function searchMultiplicity(
  tokId: string,
  query: string
): Promise<MultiplicityResponse> {
  const params = new URLSearchParams({ query });
  const url = `${BASE}/multiplicity/search/${tokId}?${params}`;
  console.log('Search URL:', url);  
  return fetchJSON<MultiplicityResponse>(url);
}


export async function getMultiplicity(
  tokId: string,
  page = 1,
  pageSize = 50
): Promise<MultiplicityResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return fetchJSON<MultiplicityResponse>(
        `${BASE}/multiplicity/${tokId}?${params}`  
    // `${BASE}/multiplicity/${encodeURIComponent(tokId)}?${params}`
  );
}

// Language composition
export async function getLanguageComposition(tokId: string): Promise<LanguageCompositionResponse> {
  return fetchJSON<LanguageCompositionResponse>(
    `${BASE}/language/${encodeURIComponent(tokId)}`
  );
}

// Morphemes
export async function getMorphemes(
  tokId: string,
  page = 1,
  pageSize = 100,
  typeFilter = ''
): Promise<MorphemeAnalysisResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (typeFilter) params.set('type_filter', typeFilter);
  return fetchJSON<MorphemeAnalysisResponse>(
    `${BASE}/morphemes/${encodeURIComponent(tokId)}?${params}`
  );
}

// Undertrained
export async function getUndertrained(
  tokId: string,
  page = 1,
  pageSize = 100
): Promise<UndertrainedResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return fetchJSON<UndertrainedResponse>(
    `${BASE}/undertrained/${encodeURIComponent(tokId)}?${params}`
  );
}

// Comparison
export async function getOverlap(tokenizerIds: string[]): Promise<OverlapResult> {
  return fetchJSON<OverlapResult>(`${BASE}/comparison/overlap`, {
    method: 'POST',
    body: JSON.stringify({ tokenizer_ids: tokenizerIds }),
  });
}

export async function compareTokenize(
  tokenizerIds: string[],
  text: string
): Promise<ComparisonTokenizeResponse> {
  return fetchJSON<ComparisonTokenizeResponse>(`${BASE}/comparison/tokenize`, {
    method: 'POST',
    body: JSON.stringify({ tokenizer_ids: tokenizerIds, text }),
  });
}

export async function compareEfficiency(
  tokenizerIds: string[],
  sampleTexts?: string[]
): Promise<EfficiencyResponse> {
  return fetchJSON<EfficiencyResponse>(`${BASE}/comparison/efficiency`, {
    method: 'POST',
    body: JSON.stringify({ tokenizer_ids: tokenizerIds, sample_texts: sampleTexts }),
  });
}

// Merge Tree
export async function compareMergeTrees(
  tokenizerIds: [string, string],
  text: string
): Promise<MergeTreeComparisonResponse> {
  return fetchJSON<MergeTreeComparisonResponse>(`${BASE}/merge-tree/compare`, {
    method: 'POST',
    body: JSON.stringify({ tokenizer_ids: tokenizerIds, text }),
  });
}
