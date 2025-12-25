// Anthropic API Provider

import { BaseProvider } from './base.js';

export class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'claude-3-haiku-20240307';
    this.endpoint = 'https://api.anthropic.com/v1/messages';
  }

  validateConfig() {
    if (!this.apiKey) {
      return { valid: false, error: 'API key is required' };
    }
    if (!this.apiKey.startsWith('sk-ant-')) {
      return { valid: false, error: 'Invalid API key format' };
    }
    return { valid: true };
  }

  async testConnection() {
    try {
      // Anthropic doesn't have a simple health check endpoint,
      // so we make a minimal request
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key');
        }
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      return {
        success: true,
        message: 'Connected to Anthropic API successfully!'
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
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      const isClickbait = this.parseResponse(content);

      return { isClickbait };
    } catch (error) {
      console.error('Anthropic analysis failed:', error);
      throw error;
    }
  }
}
