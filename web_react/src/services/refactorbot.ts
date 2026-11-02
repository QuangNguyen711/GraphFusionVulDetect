// RefactorBot API Service
import { createAuthHeaders } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface RefactoringSuggestion {
  type: string;
  description: string;
  code?: string;
  content?: string;
  url?: string;
}

export interface RefactoringAdviceResponse {
  suggestions: RefactoringSuggestion[];
  explanation: string;
  analysis?: any;
  validation?: any;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationResponse {
  bot_message: string;
  suggested_code?: string;
}

export interface ValidationResponse {
  is_valid: boolean;
  message: string;
}

class RefactorBotService {
  private baseUrl = `${API_BASE_URL}/api/v1/refactor`;

  /**
   * Get AI-powered refactoring advice for a code snippet
   */
  async getRefactoringAdvice(
    code: string,
    issueDescription: string
  ): Promise<RefactoringAdviceResponse> {
    const response = await fetch(`${this.baseUrl}/advice`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        code,
        issue_description: issueDescription
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get refactoring advice');
    }

    return response.json();
  }

  /**
   * Continue conversation with the chatbot
   */
  async continueConversation(
    code: string,
    conversationHistory: ConversationMessage[]
  ): Promise<ConversationResponse> {
    const response = await fetch(`${this.baseUrl}/conversation`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        code,
        conversation_history: conversationHistory
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to continue conversation');
    }

    return response.json();
  }

  /**
   * Validate refactored code
   */
  async validateRefactoring(
    originalCode: string,
    suggestedCode: string
  ): Promise<ValidationResponse> {
    const response = await fetch(`${this.baseUrl}/validate`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        original_code: originalCode,
        suggested_code: suggestedCode
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to validate refactoring');
    }

    return response.json();
  }
}

export const refactorBotService = new RefactorBotService();
