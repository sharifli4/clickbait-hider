// Ollama Local LLM Provider

import { BaseProvider } from './base.js';

export class OllamaProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.endpoint = config.endpoint || 'http://localhost:11434';
    this.model = config.model || 'llama3.2';
  }

  validateConfig() {
    if (!this.endpoint) {
      return { valid: false, error: 'Endpoint URL is required' };
    }
    return { valid: true };
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const models = data.models?.map(m => m.name) || [];

      // No models installed
      if (models.length === 0) {
        return {
          success: false,
          error: `No models installed. Run: ollama pull ${this.model}`,
          models
        };
      }

      // Check if configured model exists
      const modelExists = models.some(m => m.startsWith(this.model.split(':')[0]));
      if (!modelExists) {
        return {
          success: false,
          error: `Model "${this.model}" not found. Available: ${models.join(', ')}. Run: ollama pull ${this.model}`,
          models
        };
      }

      return {
        success: true,
        message: `Connected! Using model: ${this.model}`,
        models
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to Ollama: ${error.message}`
      };
    }
  }

  async analyze(text) {
    const prompt = this.getPrompt(text);

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 10
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const isClickbait = this.parseResponse(data.response || '');

      return { isClickbait };
    } catch (error) {
      console.error('Ollama analysis failed:', error);
      throw error;
    }
  }
}
