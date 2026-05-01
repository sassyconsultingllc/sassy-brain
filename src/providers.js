/**
 * Sassy Brain — Provider Catalog
 *
 * Each provider advertises:
 *   id          stable identifier used in store + IPC
 *   label       human-readable name shown in dropdowns / setup
 *   kind        which adapter to use (anthropic | openai | gemini)
 *   needsKey    true = shown on the setup screen; false = local / no auth
 *   keyHint     optional placeholder pattern shown in setup
 *   keyUrl      optional signup link shown in setup
 *   defaultModel
 *   models      hint list shown as <datalist> — model field is free-text
 *
 * Adapters (kind) handle the wire format: endpoint URL, auth header,
 * request body shape, and streaming chunk extraction. All three adapters
 * accept a `overlay` object that is shallow-merged into the request body
 * last, so the user can override ANY parameter the provider supports.
 */

const CATALOG = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    kind: 'anthropic',
    needsKey: true,
    keyHint: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022'
    ]
  },
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai',
    needsKey: true,
    keyHint: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o3-mini', 'gpt-4-turbo']
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    kind: 'openai',
    needsKey: true,
    keyHint: 'xai-...',
    keyUrl: 'https://console.x.ai/',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-code-fast-1',
    models: ['grok-code-fast-1', 'grok-2-latest', 'grok-4', 'grok-3-fast']
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    kind: 'gemini',
    needsKey: true,
    keyHint: 'AIza...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    defaultModel: 'gemini-2.0-flash',
    models: [
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-exp-1206'
    ]
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'openai',
    needsKey: true,
    keyHint: 'sk-or-...',
    keyUrl: 'https://openrouter.ai/keys',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    models: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
      'qwen/qwen-2.5-coder-32b-instruct',
      'google/gemini-2.0-flash-exp:free'
    ],
    extraHeaders: {
      'HTTP-Referer': 'https://sassybrain.local',
      'X-Title': 'Sassy Brain'
    }
  },
  {
    id: 'groq',
    label: 'Groq',
    kind: 'openai',
    needsKey: true,
    keyHint: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'deepseek-r1-distill-llama-70b'
    ]
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    kind: 'openai',
    needsKey: true,
    keyHint: 'sk-...',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  {
    id: 'mistral',
    label: 'Mistral',
    kind: 'openai',
    needsKey: true,
    keyHint: '...',
    keyUrl: 'https://console.mistral.ai/api-keys/',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest', 'open-mistral-nemo']
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    kind: 'openai',
    needsKey: false,
    endpoint: 'http://localhost:11434/v1/chat/completions',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'llama3.1', 'qwen2.5-coder', 'deepseek-r1', 'mistral-nemo']
  }
];

const BY_ID = Object.fromEntries(CATALOG.map(p => [p.id, p]));

function listProviders() {
  // Shallow clone — the renderer gets the catalog for dropdown population.
  return CATALOG.map(p => ({
    id: p.id,
    label: p.label,
    kind: p.kind,
    needsKey: !!p.needsKey,
    keyHint: p.keyHint || '',
    keyUrl: p.keyUrl || '',
    defaultModel: p.defaultModel,
    models: p.models.slice()
  }));
}

function getProvider(id) {
  return BY_ID[id];
}

// ── Adapters ────────────────────────────────────────────────────────
// All adapters return { url, headers, body } for a given request.
// `overlay` is an object the caller supplies (per-slot session overlay);
// it is shallow-merged into the body AFTER the base fields, so the user
// can override anything including `model`, `messages`, `tools`, etc.

function buildAnthropicRequest(p, { apiKey, model, messages, stream, overlay }) {
  const systemMsg = messages.find(m => m.role === 'system');
  const nonSystem = messages.filter(m => m.role !== 'system');
  const base = {
    model: model || p.defaultModel,
    max_tokens: 4096,
    messages: nonSystem
  };
  if (stream) base.stream = true;
  if (systemMsg) base.system = systemMsg.content;
  return {
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(Object.assign(base, overlay || {}))
  };
}

function parseAnthropicStream(parsed) {
  if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.text) {
    return parsed.delta.text;
  }
  return '';
}

function parseAnthropicComplete(data) {
  if (!data || !Array.isArray(data.content)) return '';
  return data.content.map(c => c.text || '').join('');
}

function buildOpenAIRequest(p, { apiKey, model, messages, stream, overlay }) {
  const base = {
    model: model || p.defaultModel,
    messages
  };
  if (stream) base.stream = true;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  if (p.extraHeaders) Object.assign(headers, p.extraHeaders);
  return {
    url: p.endpoint,
    headers,
    body: JSON.stringify(Object.assign(base, overlay || {}))
  };
}

function parseOpenAIStream(parsed) {
  return (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) || '';
}

function parseOpenAIComplete(data) {
  return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

function buildGeminiRequest(p, { apiKey, model, messages, stream, overlay }) {
  const usedModel = model || p.defaultModel;
  const action = stream ? 'streamGenerateContent' : 'generateContent';
  const suffix = stream ? '&alt=sse' : '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(usedModel)}:${action}?key=${encodeURIComponent(apiKey)}${suffix}`;

  const systemMsg = messages.find(m => m.role === 'system');
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
  const base = { contents };
  if (systemMsg) base.system_instruction = { parts: [{ text: systemMsg.content }] };

  return {
    url,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign(base, overlay || {}))
  };
}

function parseGeminiStream(parsed) {
  try {
    return parsed.candidates[0].content.parts[0].text || '';
  } catch (_) { return ''; }
}

function parseGeminiComplete(data) {
  try {
    return data.candidates[0].content.parts.map(p => p.text || '').join('');
  } catch (_) { return ''; }
}

function buildRequest(providerId, opts) {
  const p = BY_ID[providerId];
  if (!p) throw new Error(`Unknown provider: ${providerId}`);
  if (p.kind === 'anthropic') return buildAnthropicRequest(p, opts);
  if (p.kind === 'gemini') return buildGeminiRequest(p, opts);
  if (p.kind === 'openai') return buildOpenAIRequest(p, opts);
  throw new Error(`Unknown provider kind: ${p.kind}`);
}

function parseStreamChunk(providerId, parsed) {
  const p = BY_ID[providerId];
  if (!p) return '';
  if (p.kind === 'anthropic') return parseAnthropicStream(parsed);
  if (p.kind === 'gemini') return parseGeminiStream(parsed);
  return parseOpenAIStream(parsed);
}

function parseComplete(providerId, data) {
  const p = BY_ID[providerId];
  if (!p) return '';
  if (p.kind === 'anthropic') return parseAnthropicComplete(data);
  if (p.kind === 'gemini') return parseGeminiComplete(data);
  return parseOpenAIComplete(data);
}

// ── Usage / metadata extractors ─────────────────────────────────────
// Return { input, output, finishReason } when present on a parsed frame.
// Called for every SSE frame — caller should merge non-null fields into
// a running metadata object so whichever frame carries usage wins.
function extractStreamMeta(providerId, parsed) {
  const p = BY_ID[providerId];
  if (!p) return null;
  const out = {};
  if (p.kind === 'anthropic') {
    // message_start carries input tokens; message_delta carries output
    if (parsed.type === 'message_start' && parsed.message && parsed.message.usage) {
      out.input = parsed.message.usage.input_tokens;
      out.output = parsed.message.usage.output_tokens;
    } else if (parsed.type === 'message_delta' && parsed.usage) {
      if (typeof parsed.usage.output_tokens === 'number') out.output = parsed.usage.output_tokens;
      if (parsed.delta && parsed.delta.stop_reason) out.finishReason = parsed.delta.stop_reason;
    }
  } else if (p.kind === 'gemini') {
    if (parsed.usageMetadata) {
      out.input = parsed.usageMetadata.promptTokenCount;
      out.output = parsed.usageMetadata.candidatesTokenCount;
    }
    if (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].finishReason) {
      out.finishReason = parsed.candidates[0].finishReason;
    }
  } else { // openai-compatible
    if (parsed.usage) {
      out.input = parsed.usage.prompt_tokens;
      out.output = parsed.usage.completion_tokens;
    }
    if (parsed.choices && parsed.choices[0] && parsed.choices[0].finish_reason) {
      out.finishReason = parsed.choices[0].finish_reason;
    }
  }
  return Object.keys(out).length ? out : null;
}

// For the non-streaming `complete` call, pull usage from the final response.
function extractCompleteMeta(providerId, data) {
  const p = BY_ID[providerId];
  if (!p || !data) return null;
  const out = {};
  if (p.kind === 'anthropic') {
    if (data.usage) { out.input = data.usage.input_tokens; out.output = data.usage.output_tokens; }
    if (data.stop_reason) out.finishReason = data.stop_reason;
  } else if (p.kind === 'gemini') {
    if (data.usageMetadata) {
      out.input = data.usageMetadata.promptTokenCount;
      out.output = data.usageMetadata.candidatesTokenCount;
    }
    if (data.candidates && data.candidates[0] && data.candidates[0].finishReason) {
      out.finishReason = data.candidates[0].finishReason;
    }
  } else {
    if (data.usage) { out.input = data.usage.prompt_tokens; out.output = data.usage.completion_tokens; }
    if (data.choices && data.choices[0] && data.choices[0].finish_reason) {
      out.finishReason = data.choices[0].finish_reason;
    }
  }
  return Object.keys(out).length ? out : null;
}

// For OpenAI-compatible providers, usage is only reported at stream end
// if the caller opts in via `stream_options: {include_usage: true}`.
// `needsStreamUsageOpt` tells the main process to inject that option
// unless the user's overlay has already set stream_options.
function needsStreamUsageOpt(providerId) {
  const p = BY_ID[providerId];
  return p && p.kind === 'openai';
}

module.exports = {
  CATALOG,
  listProviders,
  getProvider,
  buildRequest,
  parseStreamChunk,
  parseComplete,
  extractStreamMeta,
  extractCompleteMeta,
  needsStreamUsageOpt
};
