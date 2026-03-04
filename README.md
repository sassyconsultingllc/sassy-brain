# Sassy Brain v0.2.0

**Multi-AI consensus engine. 5 providers debate, you get truth.**

An Electron desktop app that sends your prompt to multiple AI providers simultaneously, lets them debate and refine their answers, then synthesizes the consensus truth.

## Providers

| Provider | Free Tier | Models |
|----------|-----------|--------|
| **Claude** (Anthropic) | No | Sonnet 4, Haiku 4.5, Opus 4.5 |
| **Grok** (xAI) | No | Grok-3-fast, Grok-3, Grok-3-mini |
| **Gemini** (Google) | ✅ Yes | Flash 2.0, Flash-Lite, 1.5-Flash |
| **Mistral** | ✅ Yes | Small, Medium, Nemo |
| **HuggingFace** | ✅ Yes | Llama 3.3 70B, Mixtral 8x7B, Qwen 72B |

## How It Works

1. **Setup**: Enter API keys (at least 1 required, 2+ for consensus)
2. **Consensus Mode**: Your prompt goes to all selected providers simultaneously
3. **Deliberation**: Each reads the others' responses and refines (configurable rounds)
4. **Synthesis**: Final merged answer presented as unified truth
5. **Steering**: Redirect mid-stream without losing context

## Features

- 5-provider consensus — pick any 2+ for debate
- Async message steering — redirect while streaming
- Encrypted key storage — keys never leave your machine except to their API
- Per-provider mode — use any single provider directly
- Message queue — stack prompts while streaming
- Free tier support — Gemini, Mistral, HuggingFace all have free tiers

## Quick Start

```bash
git clone https://github.com/sassyconsultingllc/sassy-brain.git
cd sassy-brain
npm install
npm start
```

## Build

```bash
npm run build          # Windows installer
npm run build-portable # Windows portable
npm run build-linux    # Linux AppImage + deb
npm run build-all      # All platforms
```

## Architecture

- **Main process** (`src/main.js`): API calls, key management, streaming
- **Renderer** (`src/chat.html`): Single-file UI with consensus engine
- **Preload** (`src/preload.js`): Secure IPC bridge
- **Setup** (`src/setup.html`): Dynamic key configuration

Keys encrypted via `electron-store`. All API calls from main process (no CORS, no key exposure in renderer).

## License

MIT — Built by [Sassy Consulting LLC](https://sassyconsultingllc.com)
