// Clickbait Hider - Content Script
// Observes Twitter/X DOM and marks clickbait posts

const TWEET_SELECTOR = 'article[data-testid="tweet"]';
const TWEET_TEXT_SELECTOR = 'div[data-testid="tweetText"]';
const PROCESSED_ATTR = 'data-clickbait-processed';

// Track analyzed tweets to avoid re-processing
const analyzedTweets = new Map();

// Check if extension is enabled
let isEnabled = true;

// Initialize extension state
chrome.storage.local.get(['enabled'], (result) => {
  isEnabled = result.enabled !== false;
});

// Listen for state changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue;
    if (!isEnabled) {
      // Remove all blur effects when disabled
      document.querySelectorAll('.clickbait-blur').forEach(el => {
        el.classList.remove('clickbait-blur');
      });
      document.querySelectorAll('.clickbait-overlay').forEach(el => {
        el.remove();
      });
    }
  }
});

// Generate a hash for tweet text to use as cache key
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

// Create the "Show anyway" overlay button
function createOverlay(tweetElement) {
  const overlay = document.createElement('div');
  overlay.className = 'clickbait-overlay';
  overlay.innerHTML = `
    <div class="clickbait-overlay-content">
      <span class="clickbait-warning">Potential Clickbait Detected</span>
      <button class="clickbait-reveal-btn">Show anyway</button>
    </div>
  `;

  const revealBtn = overlay.querySelector('.clickbait-reveal-btn');
  revealBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    tweetElement.classList.remove('clickbait-blur');
    overlay.remove();
  });

  return overlay;
}

// Analyze a single tweet
async function analyzeTweet(tweetElement) {
  if (!isEnabled) return;
  if (tweetElement.hasAttribute(PROCESSED_ATTR)) return;

  tweetElement.setAttribute(PROCESSED_ATTR, 'true');

  const textElement = tweetElement.querySelector(TWEET_TEXT_SELECTOR);
  if (!textElement) return;

  const tweetText = textElement.textContent.trim();
  if (!tweetText || tweetText.length < 10) return;

  const textHash = hashText(tweetText);

  // Check local cache first
  if (analyzedTweets.has(textHash)) {
    if (analyzedTweets.get(textHash)) {
      applyBlur(tweetElement);
    }
    return;
  }

  try {
    // Send to background script for LLM analysis
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_TWEET',
      text: tweetText,
      hash: textHash
    });

    if (response && response.isClickbait) {
      analyzedTweets.set(textHash, true);
      applyBlur(tweetElement);
      updateStats('hidden');
    } else {
      analyzedTweets.set(textHash, false);
    }
    updateStats('scanned');
  } catch (error) {
    console.error('Clickbait Hider: Analysis failed', error);
  }
}

// Apply blur effect to tweet
function applyBlur(tweetElement) {
  if (!isEnabled) return;

  tweetElement.classList.add('clickbait-blur');

  // Add overlay if not already present
  if (!tweetElement.querySelector('.clickbait-overlay')) {
    const overlay = createOverlay(tweetElement);
    tweetElement.style.position = 'relative';
    tweetElement.appendChild(overlay);
  }
}

// Update statistics
function updateStats(type) {
  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || { scanned: 0, hidden: 0 };
    stats[type]++;
    chrome.storage.local.set({ stats });
  });
}

// Process all visible tweets
function processTweets() {
  const tweets = document.querySelectorAll(TWEET_SELECTOR);
  tweets.forEach(tweet => {
    if (!tweet.hasAttribute(PROCESSED_ATTR)) {
      analyzeTweet(tweet);
    }
  });
}

// Set up MutationObserver to detect new tweets
const observer = new MutationObserver((mutations) => {
  let hasNewTweets = false;

  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches?.(TWEET_SELECTOR) || node.querySelector?.(TWEET_SELECTOR)) {
            hasNewTweets = true;
            break;
          }
        }
      }
    }
    if (hasNewTweets) break;
  }

  if (hasNewTweets) {
    // Debounce processing
    clearTimeout(observer.timeout);
    observer.timeout = setTimeout(processTweets, 100);
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Process initial tweets
processTweets();

console.log('Clickbait Hider: Content script loaded');
