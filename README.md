
# SASSY BRAIN

**Multi-AI Consensus Engine. Claude + Grok debate, you get truth.**

Built by [Sassy Consulting LLC](https://sassyconsultingllc.com) · Veteran-owned

Current Version: **0.2.0**

----

## What Is This?

Sassy Brain is an Electron desktop application that runs your prompts through multiple AI models simultaneously, lets them deliberate, and presents you with a consensus answer. Think of it as adversarial collaboration — the AIs challenge each other's reasoning before you see the result.

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


## Quick Start

```bash
git clone https://github.com/sassyconsultingllc/sassy-brain.git
cd sassy-brain
npm install
npm start
```

On first launch, you'll be prompted to enter API keys:

| Provider | Required | Get Key |
|----------|----------|---------|
| **Anthropic (Claude)** | Yes* | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **xAI (Grok)** | Yes* | [console.x.ai](https://console.x.ai/) |
| **GitHub** | Optional | [github.com/settings/tokens](https://github.com/settings/tokens) |

\* At least one AI key required. Both needed for Consensus Mode.


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

MIT — Built by Sassy Consulting LLC
