// RefactorBot API Service
import { createAuthHeaders } from './api';
import { readPreferences } from "@/lib/preferences";

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
        issue_description: issueDescription,
        language: readPreferences().language
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
        conversation_history: conversationHistory,
        language: readPreferences().language
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to continue conversation');
    }

    return response.json();
  }

  /**
   * Stream the assistant's next reply; onDelta receives each piece of text
   */
  async streamChat(
    code: string,
    conversationHistory: ConversationMessage[],
    onDelta: (text: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: createAuthHeaders(),
      signal,
      body: JSON.stringify({
        code,
        conversation_history: conversationHistory,
        language: readPreferences().language
      })
    });

    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.error) throw new Error(event.error);
        if (event.delta) onDelta(event.delta);
        if (event.done) finished = true;
      }
    }
    if (!finished) throw new Error('The reply was cut off before it finished.');
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
