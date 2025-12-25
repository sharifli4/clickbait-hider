// Error Logger - stores errors locally with option to report

const MAX_ERRORS = 50;
const VERSION = chrome.runtime.getManifest().version;

let currentProviderType = 'unknown';

export function setProviderType(type) {
  currentProviderType = type;
}

export async function logError(error, context = '') {
  try {
    const { errorLogs = [] } = await chrome.storage.local.get(['errorLogs']);

    const errorEntry = {
      message: context ? `${context}: ${error.message}` : error.message,
      stack: error.stack || 'No stack trace',
      provider: currentProviderType,
      timestamp: new Date().toISOString(),
      version: VERSION
    };

    errorLogs.unshift(errorEntry);

    // Keep only last MAX_ERRORS
    if (errorLogs.length > MAX_ERRORS) {
      errorLogs.length = MAX_ERRORS;
    }

    await chrome.storage.local.set({ errorLogs });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

export async function getErrorLogs() {
  const { errorLogs = [] } = await chrome.storage.local.get(['errorLogs']);
  return errorLogs;
}

export async function clearErrorLogs() {
  await chrome.storage.local.set({ errorLogs: [] });
}

export function generateErrorReport(errors) {
  if (errors.length === 0) return 'No errors logged.';

  let report = `Clickbait Hider Error Report\n`;
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `Version: ${VERSION}\n\n`;
  report += `=== Errors (${errors.length}) ===\n\n`;

  errors.forEach((err, i) => {
    report += `--- Error ${i + 1} ---\n`;
    report += `Time: ${err.timestamp}\n`;
    report += `Provider: ${err.provider}\n`;
    report += `Message: ${err.message}\n`;
    report += `Stack: ${err.stack}\n\n`;
  });

  return report;
}
