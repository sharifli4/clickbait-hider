// OpenAI API Provider

import { BaseProvider } from './base.js';

export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'gpt-4o-mini';
    this.endpoint = 'https://api.openai.com/v1/chat/completions';
  }

  validateConfig() {
    if (!this.apiKey) {
      return { valid: false, error: 'API key is required' };
    }
    if (!this.apiKey.startsWith('sk-')) {
      return { valid: false, error: 'Invalid API key format' };
    }
    return { valid: true };
  }

  async testConnection() {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return {
        success: true,
        message: 'Connected to OpenAI API successfully!'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect: ${error.message}`
      };
    }
  }

  async analyze(text) {
    const prompt = this.getPrompt(text);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 10,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const isClickbait = this.parseResponse(content);

      return { isClickbait };
    } catch (error) {
      console.error('OpenAI analysis failed:', error);
      throw error;
    }
  }
}
