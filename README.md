<<<<<<< HEAD

# SASSY BRAIN
=======
# Sassy Brain v0.2.0
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9

**Multi-AI consensus engine. 5 providers debate, you get truth.**

An Electron desktop app that sends your prompt to multiple AI providers simultaneously, lets them debate and refine their answers, then synthesizes the consensus truth.

<<<<<<< HEAD
Current Version: **0.2.0**

----
=======
## Providers
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9

| Provider | Free Tier | Models |
|----------|-----------|--------|
| **Claude** (Anthropic) | No | Sonnet 4, Haiku 4.5, Opus 4.5 |
| **Grok** (xAI) | No | Grok-3-fast, Grok-3, Grok-3-mini |
| **Gemini** (Google) | ✅ Yes | Flash 2.0, Flash-Lite, 1.5-Flash |
| **Mistral** | ✅ Yes | Small, Medium, Nemo |
| **HuggingFace** | ✅ Yes | Llama 3.3 70B, Mixtral 8x7B, Qwen 72B |

## How It Works

<<<<<<< HEAD
**Architecture inspired by** [Grok-Desktop](https://github.com/AnRkey/Grok-Desktop) (ISC License) with substantial additions for multi-model consensus, async message steering, API-driven chat, and provider-specific features.


## Features


### Consensus Mode ⚡
Your prompt goes to Claude (Anthropic) and Grok (xAI) simultaneously. They each respond independently, then read each other's answers and refine through configurable debate rounds (default: 2). The final synthesized answer is streamed to you — no attribution to either AI, just the agreed-upon truth.


### System Message Support (NEW)
You can now provide a system message for Anthropic and Gemini models, giving you more control over the AI's behavior and context.

### Provider-Specific Handling (NEW)
The app automatically adapts to each provider's requirements (system message, role mapping, headers, etc.) and provides UI hints for supported features.

### Improved Error Feedback (NEW)
Input validation and error feedback are now standardized and more informative for all providers.

### Overlay Parameter Support
Advanced users can override any request parameter using the overlay editor, with per-provider merging and validation.

### Async Message Steering (VS Code-style)
Inspired by VS Code's Copilot Chat steering system. While an AI is still generating:

| Action | Behavior |
|--------|----------|
| **Add to Queue** | Message waits, sends after current response completes |
| **Steer with Message** | Interrupts current flow, your new message processes immediately |
| **Stop and Send** | Cancels everything, sends your message fresh |

Queued messages can be reordered or removed before they fire.


### Single-Provider Mode
Switch to Claude-only, Grok-only, or any supported provider from the top bar. Full streaming with the same steering capabilities.


### AI Chat History Importer
Import conversations from ChatGPT, Gemini, Perplexity, Grok, Manus, or other AI systems. Full skill included in `importers/` — supports direct paste, file upload, and API fetch.


### Security
- API keys encrypted locally via `electron-store` (AES)
- Keys never leave your machine except to their own API endpoints
- `contextIsolation: true`, `nodeIntegration: false` — secure preload bridge
- CSP headers on all HTML pages
- No telemetry, no analytics, no tracking
=======
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
>>>>>>> 318d9216faff51c5a9e0eebbccb6aa7ec9e205b9


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


## Provider Requirements & Configuration

| Provider         | System Message | API Key Header/Field      | Endpoint/Notes                                 |
|------------------|---------------|--------------------------|------------------------------------------------|
| Anthropic        | Yes           | x-api-key                | /v1/messages, system separate                  |
| OpenAI           | No            | Authorization: Bearer     | /v1/chat/completions                           |
| xAI (Grok)       | No            | Authorization: Bearer     | /v1/chat/completions                           |
| Gemini           | Yes           | key (query param)         | /v1beta/models/{model}:action, system separate |
| OpenRouter       | No            | Authorization + extra hdr | /api/v1/chat/completions, extra headers        |
| Groq, DeepSeek, Mistral, Ollama | No | Authorization: Bearer | /v1/chat/completions                           |

See `importers/CONFIGURATION.md` for full API key setup and security best practices.

## Overlay & Advanced Usage

- Use the overlay editor ({ JSON }) to override any request parameter per provider.
- Overlays are shallow-merged; see provider docs for supported fields.
- System messages are only sent for providers that support them.

## Troubleshooting

- If you see errors, check your API key, model, and overlay fields.
- For provider-specific issues, see the table above and `importers/CONFIGURATION.md`.
- For advanced debugging, run with `npm run dev` for verbose output.

## Changelog

### 0.2.0
- System message support for Anthropic and Gemini
- Provider-specific UI and request handling
- Improved error feedback and input validation
- Overlay editor improvements and documentation
- Updated documentation and provider requirements table

## License

MIT — Built by [Sassy Consulting LLC](https://sassyconsultingllc.com)
