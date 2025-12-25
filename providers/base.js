// Base LLM Provider Interface

export class BaseProvider {
  constructor(config = {}) {
    this.config = config;
  }

  // Analyze text and return { isClickbait: boolean }
  async analyze(text) {
    throw new Error('analyze() must be implemented by subclass');
  }

  // Validate provider configuration
  validateConfig() {
    throw new Error('validateConfig() must be implemented by subclass');
  }

  // Test connection to the provider
  async testConnection() {
    throw new Error('testConnection() must be implemented by subclass');
  }

  // Get the clickbait detection prompt
  getPrompt(text) {
    return `Is this social media post clickbait? Clickbait uses sensational, misleading, or vague language to get clicks. Answer only YES or NO.

Post: "${text}"`;
  }

  // Parse YES/NO response from LLM
  parseResponse(response) {
    const cleaned = response.trim().toUpperCase();
    return cleaned.includes('YES');
  }
}
