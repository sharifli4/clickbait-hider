// Clickbait Hider - Popup Script

const PROVIDER_NAMES = {
  'ollama': 'Ollama (Local)',
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'chrome-ai': 'Chrome AI'
};

// DOM elements
const enableToggle = document.getElementById('enableToggle');
const scannedCount = document.getElementById('scannedCount');
const hiddenCount = document.getElementById('hiddenCount');
const providerName = document.getElementById('providerName');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const warningBanner = document.getElementById('warningBanner');
const settingsLink = document.getElementById('settingsLink');

// Load initial state
async function loadState() {
  const result = await chrome.storage.local.get(['enabled', 'stats', 'providerType', 'configured']);

  // Set toggle state
  enableToggle.checked = result.enabled !== false;

  // Set stats
  const stats = result.stats || { scanned: 0, hidden: 0 };
  scannedCount.textContent = formatNumber(stats.scanned);
  hiddenCount.textContent = formatNumber(stats.hidden);

  // Set provider info
  const type = result.providerType || 'ollama';
  const configured = result.configured || false;

  providerName.textContent = PROVIDER_NAMES[type] || type;

  if (configured) {
    statusDot.className = 'status-dot configured';
    statusText.textContent = 'Active';
    warningBanner.style.display = 'none';
  } else {
    statusDot.className = 'status-dot not-configured';
    statusText.textContent = 'Not configured';
    warningBanner.style.display = 'block';
  }
}

// Format large numbers
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Handle toggle change
enableToggle.addEventListener('change', async () => {
  await chrome.storage.local.set({ enabled: enableToggle.checked });
});

// Open settings in new tab
settingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.stats) {
    const stats = changes.stats.newValue || { scanned: 0, hidden: 0 };
    scannedCount.textContent = formatNumber(stats.scanned);
    hiddenCount.textContent = formatNumber(stats.hidden);
  }
});

// Initialize
loadState();
