// Clickbait Hider - Options Script

// DOM elements
const providerSelect = document.getElementById('providerSelect');
const statusMessage = document.getElementById('statusMessage');
const testBtn = document.getElementById('testBtn');
const saveBtn = document.getElementById('saveBtn');
const resetStatsBtn = document.getElementById('resetStatsBtn');
const sendReportBtn = document.getElementById('sendReportBtn');
const clearErrorsBtn = document.getElementById('clearErrorsBtn');
const errorCountEl = document.getElementById('errorCount');
const errorListEl = document.getElementById('errorList');

const REPORT_EMAIL = 'sharifli.kenan@outlook.com';

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
sendReportBtn.addEventListener('click', sendErrorReport);
clearErrorsBtn.addEventListener('click', clearErrors);

// Error log functions
async function loadErrorLogs() {
  const { errorLogs = [] } = await chrome.storage.local.get(['errorLogs']);
  errorCountEl.textContent = `${errorLogs.length} error${errorLogs.length !== 1 ? 's' : ''} logged`;

  if (errorLogs.length > 0) {
    errorListEl.style.display = 'block';
    errorListEl.innerHTML = errorLogs.map(err =>
      `<div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #38444d;">
        <div style="color: #f4212e;">${err.message}</div>
        <div style="color: #71767b; font-size: 11px;">${err.timestamp} | ${err.provider}</div>
      </div>`
    ).join('');
  } else {
    errorListEl.style.display = 'none';
  }

  return errorLogs;
}

async function sendErrorReport() {
  const errorLogs = await loadErrorLogs();
  if (errorLogs.length === 0) {
    showStatus('No errors to report.', false);
    return;
  }

  const version = chrome.runtime.getManifest().version;
  let report = `Clickbait Hider Error Report\n`;
  report += `Version: ${version}\n`;
  report += `Time: ${new Date().toISOString()}\n\n`;

  errorLogs.forEach((err, i) => {
    report += `[${i + 1}] ${err.timestamp}\n`;
    report += `Provider: ${err.provider}\n`;
    report += `Error: ${err.message}\n`;
    report += `Stack: ${err.stack}\n\n`;
  });

  const subject = encodeURIComponent(`Clickbait Hider Error Report v${version}`);
  const body = encodeURIComponent(report);
  window.open(`mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`);
}

async function clearErrors() {
  if (confirm('Clear all error logs?')) {
    await chrome.storage.local.set({ errorLogs: [] });
    loadErrorLogs();
    showStatus('Error logs cleared.');
  }
}

// Initialize
loadSettings();
loadErrorLogs();
