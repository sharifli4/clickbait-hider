// Clickbait Hider - Options Script

// DOM elements
const providerSelect = document.getElementById('providerSelect');
const statusMessage = document.getElementById('statusMessage');
const testBtn = document.getElementById('testBtn');
const saveBtn = document.getElementById('saveBtn');
const resetStatsBtn = document.getElementById('resetStatsBtn');

// Provider-specific elements
const providerSections = {
  'ollama': document.getElementById('ollama-settings'),
  'openai': document.getElementById('openai-settings'),
  'anthropic': document.getElementById('anthropic-settings'),
  'chrome-ai': document.getElementById('chrome-ai-settings')
};

// Input elements
const inputs = {
  ollamaEndpoint: document.getElementById('ollamaEndpoint'),
  ollamaModel: document.getElementById('ollamaModel'),
  openaiKey: document.getElementById('openaiKey'),
  openaiModel: document.getElementById('openaiModel'),
  anthropicKey: document.getElementById('anthropicKey'),
  anthropicModel: document.getElementById('anthropicModel')
};

// Show/hide provider settings
function showProviderSettings(provider) {
  Object.keys(providerSections).forEach(key => {
    providerSections[key].classList.toggle('active', key === provider);
  });
}

// Load saved settings
async function loadSettings() {
  const result = await chrome.storage.local.get(['providerType', 'providerConfig']);

  const providerType = result.providerType || 'ollama';
  const config = result.providerConfig || {};

  providerSelect.value = providerType;
  showProviderSettings(providerType);

  // Load provider-specific config
  if (config.ollama) {
    inputs.ollamaEndpoint.value = config.ollama.endpoint || 'http://localhost:11434';
    inputs.ollamaModel.value = config.ollama.model || 'llama3.2';
  } else {
    inputs.ollamaEndpoint.value = 'http://localhost:11434';
    inputs.ollamaModel.value = 'llama3.2';
  }

  if (config.openai) {
    inputs.openaiKey.value = config.openai.apiKey || '';
    inputs.openaiModel.value = config.openai.model || 'gpt-4o-mini';
  }

  if (config.anthropic) {
    inputs.anthropicKey.value = config.anthropic.apiKey || '';
    inputs.anthropicModel.value = config.anthropic.model || 'claude-3-haiku-20240307';
  }
}

// Get current config for selected provider
function getCurrentConfig() {
  const provider = providerSelect.value;

  switch (provider) {
    case 'ollama':
      return {
        endpoint: inputs.ollamaEndpoint.value || 'http://localhost:11434',
        model: inputs.ollamaModel.value || 'llama3.2'
      };
    case 'openai':
      return {
        apiKey: inputs.openaiKey.value,
        model: inputs.openaiModel.value || 'gpt-4o-mini'
      };
    case 'anthropic':
      return {
        apiKey: inputs.anthropicKey.value,
        model: inputs.anthropicModel.value || 'claude-3-haiku-20240307'
      };
    case 'chrome-ai':
      return {};
    default:
      return {};
  }
}

// Show status message
function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = 'status-message ' + (isError ? 'error' : 'success');
}

// Hide status message
function hideStatus() {
  statusMessage.className = 'status-message';
}

// Test connection
async function testConnection() {
  const provider = providerSelect.value;
  const config = getCurrentConfig();

  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';
  hideStatus();

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TEST_CONNECTION',
      providerType: provider,
      providerConfig: config
    });

    if (response.success) {
      showStatus(response.message);
    } else {
      showStatus(response.error, true);
    }
  } catch (error) {
    showStatus('Failed to test connection: ' + error.message, true);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  }
}

// Save settings
async function saveSettings() {
  const provider = providerSelect.value;
  const config = getCurrentConfig();

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  hideStatus();

  try {
    // Get existing config
    const existing = await chrome.storage.local.get(['providerConfig']);
    const providerConfig = existing.providerConfig || {};

    // Update config for current provider
    providerConfig[provider] = config;

    // Save to storage
    await chrome.storage.local.set({
      providerType: provider,
      providerConfig: providerConfig,
      configured: true
    });

    showStatus('Settings saved successfully!');
  } catch (error) {
    showStatus('Failed to save settings: ' + error.message, true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Settings';
  }
}

// Reset statistics
async function resetStats() {
  if (confirm('Are you sure you want to reset all statistics?')) {
    await chrome.storage.local.set({
      stats: { scanned: 0, hidden: 0 }
    });
    showStatus('Statistics have been reset.');
  }
}

// Password toggle
document.querySelectorAll('.password-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = 'Hide';
    } else {
      input.type = 'password';
      btn.textContent = 'Show';
    }
  });
});

// Event listeners
providerSelect.addEventListener('change', () => {
  showProviderSettings(providerSelect.value);
  hideStatus();
});

testBtn.addEventListener('click', testConnection);
saveBtn.addEventListener('click', saveSettings);
resetStatsBtn.addEventListener('click', resetStats);

// Initialize
loadSettings();
