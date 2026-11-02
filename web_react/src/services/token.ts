import { apiFetch } from './api';

export interface TokenSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb?: string;
}

export interface TokenAnalysisResult {
    source_code: string;
    contract_name: string;
    file_name: string;
    abi: string;
}

class TokenService {
  /**
   * Search for tokens
   */
  async searchTokens(query: string): Promise<TokenSearchResult[]> {
    return await apiFetch<TokenSearchResult[]>(`/api/v1/token/search?query=${encodeURIComponent(query)}`, {
      requireAuth: true, // Or false if public
    });
  }

  /**
   * Fetch source code for analysis
   */
  async analyzeToken(chain: string, address: string, name: string): Promise<TokenAnalysisResult> {
    return await apiFetch<TokenAnalysisResult>('/api/v1/token/analyze', {
      method: 'POST',
      body: { chain, address, name },
      requireAuth: true,
    });
  }

  /**
   * Get platforms for a token
   */
  async getPlatforms(coinId: string): Promise<Record<string, string>> {
     return await apiFetch<Record<string, string>>(`/api/v1/token/platforms/${coinId}`, {
         requireAuth: true,
     });
  }
}

export const tokenService = new TokenService();
