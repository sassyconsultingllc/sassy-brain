# SASSY BRAIN

**Multi-AI Consensus Engine. Claude + Grok debate, you get truth.**

Built by [Sassy Consulting LLC](https://sassyconsultingllc.com) · Veteran-owned

---

## What Is This?

Sassy Brain is an Electron desktop application that runs your prompts through multiple AI models simultaneously, lets them deliberate, and presents you with a consensus answer. Think of it as adversarial collaboration — the AIs challenge each other's reasoning before you see the result.

**Architecture inspired by** [Grok-Desktop](https://github.com/AnRkey/Grok-Desktop) (ISC License) with substantial additions for multi-model consensus, async message steering, and API-driven chat.

## Features

### Consensus Mode ⚡
Your prompt goes to Claude (Anthropic) and Grok (xAI) simultaneously. They each respond independently, then read each other's answers and refine through configurable debate rounds (default: 2). The final synthesized answer is streamed to you — no attribution to either AI, just the agreed-upon truth.

### Async Message Steering (VS Code-style)
Inspired by VS Code's Copilot Chat steering system. While an AI is still generating:

| Action | Behavior |
|--------|----------|
| **Add to Queue** | Message waits, sends after current response completes |
| **Steer with Message** | Interrupts current flow, your new message processes immediately |
| **Stop and Send** | Cancels everything, sends your message fresh |

Queued messages can be reordered or removed before they fire.

### Single-Provider Mode
Switch to Claude-only or Grok-only mode from the top bar. Full streaming with the same steering capabilities.

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

## License

MIT — Built by Sassy Consulting LLC
