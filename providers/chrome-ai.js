// Chrome Built-in AI Provider (Experimental)

import { BaseProvider } from './base.js';

export class ChromeAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.session = null;
  }

  validateConfig() {
    // Chrome AI doesn't require configuration
    return { valid: true };
  }

  async checkAvailability() {
    if (typeof self === 'undefined') {
      return { available: false, reason: 'Not in browser context' };
    }

    // Check for the AI API
    if (!self.ai || !self.ai.languageModel) {
      return {
        available: false,
        reason: 'Chrome AI not available. Enable chrome://flags/#prompt-api-for-gemini-nano'
      };
    }

    try {
      const capabilities = await self.ai.languageModel.capabilities();
      if (capabilities.available === 'no') {
        return {
          available: false,
          reason: 'Gemini Nano model not available on this device'
        };
      }
      if (capabilities.available === 'after-download') {
        return {
          available: false,
          reason: 'Gemini Nano needs to be downloaded. Visit chrome://components and update "Optimization Guide On Device Model"'
        };
      }
      return { available: true };
    } catch (error) {
      return {
        available: false,
        reason: `Failed to check availability: ${error.message}`
      };
    }
  }

  async testConnection() {
    const availability = await this.checkAvailability();

    if (!availability.available) {
      return {
        success: false,
        error: availability.reason
      };
    }

    try {
      // Create a test session
      const session = await self.ai.languageModel.create();
      await session.destroy();

      return {
        success: true,
        message: 'Chrome AI (Gemini Nano) is available and ready!'
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create session: ${error.message}`
      };
    }
  }

  async getSession() {
    if (this.session) {
      return this.session;
    }

    const availability = await this.checkAvailability();
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    this.session = await self.ai.languageModel.create({
      systemPrompt: 'You are a clickbait detector. Respond only with YES or NO.'
    });

    return this.session;
  }

  async analyze(text) {
    const prompt = this.getPrompt(text);

    try {
      const session = await this.getSession();
      const response = await session.prompt(prompt);
      const isClickbait = this.parseResponse(response);

      return { isClickbait };
    } catch (error) {
      console.error('Chrome AI analysis failed:', error);
      // Reset session on error
      this.session = null;
      throw error;
    }
  }
}
