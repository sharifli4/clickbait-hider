# Clickbait Hider

Tired of "You won't believe what happened next" posts? This Chrome extension uses AI to detect and blur clickbait on Twitter/X.

## What it does

Scans tweets as you scroll and blurs the ones that look like clickbait. You can still click "Show anyway" if you really want to see them.

Works with local AI (Ollama) so your data never leaves your computer, or cloud providers if you prefer.

## Install

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/clickbait-hider.git
   cd clickbait-hider
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top right corner)

4. Click **Load unpacked** and select the `clickbait-hider` folder

5. The extension icon should appear in your toolbar. Click it to configure your AI provider.

## Ollama Setup

You need Ollama running locally. Get it from [ollama.com](https://ollama.com).

```bash
ollama pull llama3.2
```

Then allow Chrome extensions to connect:

**Linux:**
```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
echo '[Service]
Environment="OLLAMA_ORIGINS=chrome-extension://*"' | sudo tee /etc/systemd/system/ollama.service.d/override.conf
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

**Mac:**
```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

**Windows:**
Add `OLLAMA_ORIGINS=chrome-extension://*` to your environment variables and restart Ollama.

## Other providers

Also supports OpenAI and Anthropic if you have API keys. Just pick your provider in settings.

## Privacy

With Ollama, everything runs locally. With cloud providers, tweet text gets sent to their API. Nothing is stored or tracked by the extension itself.
