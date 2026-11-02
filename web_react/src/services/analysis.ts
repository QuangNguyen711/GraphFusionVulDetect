import { apiFetch } from './api';

// Analysis related types
export interface AnalysisRequest {
  file_path: string;
  analysis_type?: string;
  model_version?: string;
}

export interface VulnerabilityResult {
  type: string;
  severity: string;
  confidence: number;
  line_number?: number;
  description: string;
  recommendation?: string;
}

export interface GraphAnalysisResult {
  nodes_count: number;
  edges_count: number;
  complexity_score: number;
  graph_features: Record<string, any>;
}

export interface AnalysisResponse {
  analysis_id: string;
  file_name: string;
  file_size: number;
  analysis_timestamp: string;
  vulnerabilities: VulnerabilityResult[];
  graph_analysis?: GraphAnalysisResult;
  processing_time: number;
  status: string;
  error_message?: string;
}

export interface FileInfo {
  filename: string;
  file_size: number;
  file_type: string;
  upload_timestamp: string;
  saved_path: string;
}

// Analysis Service Class
export class AnalysisService {
  private static readonly ANALYSIS_ENDPOINTS = {
    UPLOAD: '/analyze/upload',
    ANALYZE: '/analyze/scan',
    STATUS: '/analyze/status',
    RESULTS: '/analyze/results',
    STREAM: '/analyze/stream',
  };

  /**
   * Upload file for analysis
   */
  static async uploadFile(file: File): Promise<FileInfo> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}${this.ANALYSIS_ENDPOINTS.UPLOAD}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Start analysis for uploaded file
   */
  static async startAnalysis(analysisRequest: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      const response = await apiFetch<AnalysisResponse>(this.ANALYSIS_ENDPOINTS.ANALYZE, {
        method: 'POST',
        body: analysisRequest,
        requireAuth: true,
      });

      return response;
    } catch (error) {
      console.error('Analysis start error:', error);
      throw error;
    }
  }

  /**
   * Get analysis status
   */
  static async getAnalysisStatus(analysisId: string): Promise<{ status: string; progress: number }> {
    try {
      const response = await apiFetch<{ status: string; progress: number }>(
        `${this.ANALYSIS_ENDPOINTS.STATUS}/${analysisId}`, 
        {
          method: 'GET',
          requireAuth: true,
        }
      );

      return response;
    } catch (error) {
      console.error('Get analysis status error:', error);
      throw error;
    }
  }

  /**
   * Get analysis results
   */
  static async getAnalysisResults(analysisId: string): Promise<AnalysisResponse> {
    try {
      const response = await apiFetch<AnalysisResponse>(
        `${this.ANALYSIS_ENDPOINTS.RESULTS}/${analysisId}`, 
        {
          method: 'GET',
          requireAuth: true,
        }
      );

      return response;
    } catch (error) {
      console.error('Get analysis results error:', error);
      throw error;
    }
  }

  /**
   * Stream analysis results (for real-time updates)
   */
  static createAnalysisStream(filePath: string): EventSource {
    const token = localStorage.getItem('auth_token');
    const url = new URL(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}${this.ANALYSIS_ENDPOINTS.STREAM}`);
    url.searchParams.append('file_path', filePath);
    
    const eventSource = new EventSource(url.toString(), {
      withCredentials: true,
    });

    // Add auth header if possible (note: EventSource doesn't support custom headers in all browsers)
    if (token) {
      url.searchParams.append('token', token);
    }

    return eventSource;
  }

  /**
   * Upload and analyze file in one step
   */
  static async uploadAndAnalyze(
    file: File, 
    analysisType: string = 'full',
    onProgress?: (progress: number) => void
  ): Promise<AnalysisResponse> {
    try {
      // Step 1: Upload file
      onProgress?.(10);
      const fileInfo = await this.uploadFile(file);
      
      // Step 2: Start analysis
      onProgress?.(20);
      const analysisResponse = await this.startAnalysis({
        file_path: fileInfo.saved_path,
        analysis_type: analysisType,
        model_version: 'latest',
      });

      onProgress?.(100);
      return analysisResponse;
    } catch (error) {
      console.error('Upload and analyze error:', error);
      throw error;
    }
  }

  /**
   * Get supported file types
   */
  static getSupportedFileTypes(): string[] {
    return ['.sol', '.solidity'];
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const supportedTypes = this.getSupportedFileTypes();
    
    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File quá lớn. Kích thước tối đa là 10MB.',
      };
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supportedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `Loại file không được hỗ trợ. Chỉ chấp nhận: ${supportedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }
}

export default AnalysisService;
