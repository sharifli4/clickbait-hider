// Clickbait Hider - Background Service Worker

import { OllamaProvider } from './providers/ollama.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { ChromeAIProvider } from './providers/chrome-ai.js';

// Cache for analysis results
const analysisCache = new Map();
const CACHE_MAX_SIZE = 1000;

// Current provider instance
let currentProvider = null;

// Provider factory
function createProvider(type, config) {
  switch (type) {
    case 'ollama':
      return new OllamaProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'chrome-ai':
      return new ChromeAIProvider(config);
    default:
      return null;
  }
}

// Load provider from storage
async function loadProvider() {
  const result = await chrome.storage.local.get(['providerType', 'providerConfig']);
  const type = result.providerType || 'ollama';
  const providerConfig = result.providerConfig || {};
  const config = providerConfig[type] || {};

  currentProvider = createProvider(type, config);
  return currentProvider;
}

// Initialize provider on startup
loadProvider();

// Listen for storage changes to update provider
chrome.storage.onChanged.addListener((changes) => {
  if (changes.providerType || changes.providerConfig) {
    loadProvider();
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_TWEET') {
    handleAnalyze(message).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.type === 'TEST_CONNECTION') {
    handleTestConnection(message).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_PROVIDER_INFO') {
    handleGetProviderInfo().then(sendResponse);
    return true;
  }
});

// Analyze tweet text
async function handleAnalyze(message) {
  const { text, hash } = message;

  // Check cache first
  if (analysisCache.has(hash)) {
    return { isClickbait: analysisCache.get(hash) };
  }

  // Check if extension is enabled
  const { enabled } = await chrome.storage.local.get(['enabled']);
  if (enabled === false) {
    return { isClickbait: false };
  }

  // Check if provider is configured
  const { configured } = await chrome.storage.local.get(['configured']);
  if (!configured) {
    return { isClickbait: false, error: 'Provider not configured' };
  }

  try {
    if (!currentProvider) {
      await loadProvider();
    }

    if (!currentProvider) {
      return { isClickbait: false, error: 'No provider available' };
    }

    const result = await currentProvider.analyze(text);

    // Cache the result
    if (analysisCache.size >= CACHE_MAX_SIZE) {
      // Remove oldest entry
      const firstKey = analysisCache.keys().next().value;
      analysisCache.delete(firstKey);
    }
    analysisCache.set(hash, result.isClickbait);

    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    return { isClickbait: false, error: error.message };
  }
}

// Test provider connection
async function handleTestConnection(message) {
  const { providerType, providerConfig } = message;

  try {
    const provider = createProvider(providerType, providerConfig);
    if (!provider) {
      return { success: false, error: 'Unknown provider type' };
    }

    const validation = provider.validateConfig();
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const result = await provider.testConnection();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get current provider info
async function handleGetProviderInfo() {
  const result = await chrome.storage.local.get(['providerType', 'configured']);
  return {
    providerType: result.providerType || 'ollama',
    configured: result.configured || false
  };
}

// Clear cache periodically (every hour)
setInterval(() => {
  analysisCache.clear();
}, 60 * 60 * 1000);

console.log('Clickbait Hider: Background service worker loaded');
