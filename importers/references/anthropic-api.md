# Anthropic API Integration

## Configuration

In `references/config.json`:

```json
{
  "anthropic": {
    "enabled": true,
    "api_key": "sk-ant-api03-...",
    "api_endpoint": "https://api.anthropic.com/v1",
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 4096
  }
}
```

## Fetching Conversations via API

### Using Claude API to Import Conversations

If you have conversations stored via Claude API, you can fetch and import them:

```python
import requests
import json

def fetch_claude_conversation(api_key, conversation_id=None):
    """
    Fetch conversation history from Claude API.
    Note: As of now, Claude API doesn't store conversation history server-side.
    You'll need to have saved conversations client-side.
    """
    headers = {
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
    }
    
    # If you've saved conversations with metadata
    # This is a placeholder - actual implementation depends on your storage
    return {
        'conversation_id': conversation_id,
        'messages': [],
        'metadata': {}
    }

def send_to_claude(api_key, message, conversation_history=None):
    """
    Send message to Claude API with conversation context.
    """
    url = 'https://api.anthropic.com/v1/messages'
    headers = {
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
    }
    
    messages = conversation_history or []
    messages.append({
        'role': 'user',
        'content': message
    })
    
    data = {
        'model': 'claude-sonnet-4-20250514',
        'max_tokens': 4096,
        'messages': messages
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()
```

## JavaScript/Browser Usage

### Fetch API (Browser)

```javascript
async function importFromClaudeAPI(apiKey, conversationData) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: conversationData.messages
        })
    });
    
    return await response.json();
}

async function continueConversation(apiKey, previousMessages, newMessage) {
    const messages = [
        ...previousMessages,
        { role: 'user', content: newMessage }
    ];
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: messages
        })
    });
    
    return await response.json();
}
```

## Node.js Usage

### Using @anthropic-ai/sdk

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

async function importAndContinue(previousMessages, newMessage) {
    const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
            ...previousMessages,
            { role: 'user', content: newMessage }
        ]
    });
    
    return message;
}

// Example: Import ChatGPT conversation and continue with Claude
async function crossPlatformContinuation(chatgptHistory, question) {
    // Convert ChatGPT format to Claude format
    const claudeMessages = chatgptHistory.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
    }));
    
    // Add new question
    claudeMessages.push({
        role: 'user',
        content: `Based on the above conversation: ${question}`
    });
    
    const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: claudeMessages
    });
    
    return response.content[0].text;
}
```

## Usage Patterns

### Pattern 1: Import and Continue

```javascript
// 1. Load conversation from another AI
const chatgptConvo = loadChatGPTHistory();

// 2. Parse to standard format
const parsed = parseConversation(chatgptConvo);

// 3. Send to Claude with context
const claudeResponse = await continueConversation(
    apiKey,
    parsed.messages,
    "Now help me optimize this code"
);
```

### Pattern 2: Cross-AI Synthesis

```javascript
// Compare approaches from different AIs
const chatgptAnswer = /* ... */;
const geminiAnswer = /* ... */;

const synthesisPrompt = `
I got these two different approaches:

ChatGPT's approach:
${chatgptAnswer}

Gemini's approach:
${geminiAnswer}

Which approach is better and why?
`;

const comparison = await sendToClaudeAPI(apiKey, synthesisPrompt);
```

### Pattern 3: Long Conversation Import

```javascript
// For very long conversations, chunk them
const chunks = chunkConversation(longConversation, 50); // 50 messages per chunk

for (const chunk of chunks) {
    await processChunk(apiKey, chunk);
}
```

## Rate Limits

Anthropic API rate limits (as of 2024):
- **Requests per minute**: Varies by tier
- **Tokens per minute**: Varies by tier
- **Tokens per day**: Varies by tier

Handle rate limits:

```python
import time
from anthropic import RateLimitError

def send_with_retry(client, messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model='claude-sonnet-4-20250514',
                max_tokens=4096,
                messages=messages
            )
            return response
        except RateLimitError as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                time.sleep(wait_time)
            else:
                raise
```

## Best Practices

1. **Store API keys securely**
   - Use environment variables
   - Never commit to version control
   - Rotate keys regularly

2. **Chunk large conversations**
   - Don't send 1000-message conversations at once
   - Use the chunking script provided
   - Process chunks sequentially

3. **Handle errors gracefully**
   - Implement retry logic
   - Handle rate limits
   - Log failures for debugging

4. **Optimize token usage**
   - Summarize old context when possible
   - Remove redundant messages
   - Use system messages effectively

5. **Monitor costs**
   - Track API usage
   - Set spending limits
   - Use cheaper models for simple tasks

## Dependencies

### Python
```bash
pip install anthropic requests --break-system-packages
```

### Node.js
```bash
npm install @anthropic-ai/sdk
```

### Browser
No dependencies - use native Fetch API

## Security Notes

- API keys have full account access
- Never expose keys in client-side code
- Use environment variables or secure vaults
- Monitor API usage for unauthorized access
- Rotate keys if compromised

## Example: Full Import Script

```python
#!/usr/bin/env python3
import json
import sys
from anthropic import Anthropic

def import_and_continue(history_file, question):
    # Load config
    with open('references/config.json') as f:
        config = json.load(f)
    
    if not config['anthropic']['enabled']:
        print("Anthropic API not enabled")
        return
    
    # Initialize client
    client = Anthropic(api_key=config['anthropic']['api_key'])
    
    # Load conversation history
    with open(history_file) as f:
        history = json.load(f)
    
    # Build messages
    messages = []
    for msg in history['messages']:
        messages.append({
            'role': msg['role'],
            'content': msg['content']
        })
    
    # Add new question
    messages.append({
        'role': 'user',
        'content': question
    })
    
    # Send to Claude
    response = client.messages.create(
        model=config['anthropic']['model'],
        max_tokens=config['anthropic']['max_tokens'],
        messages=messages
    )
    
    return response.content[0].text

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: script.py <history_file> <question>")
        sys.exit(1)
    
    result = import_and_continue(sys.argv[1], sys.argv[2])
    print(result)
```

## Troubleshooting

**Issue**: "Invalid API key"
- Check key format (starts with `sk-ant-api03-`)
- Verify key is active in console
- Check for extra spaces/newlines

**Issue**: Rate limit errors
- Implement exponential backoff
- Reduce request frequency
- Upgrade API tier if needed

**Issue**: Token limit exceeded
- Chunk conversation into smaller parts
- Summarize older messages
- Use context window more efficiently

**Issue**: Model not found
- Verify model string matches current models
- Check Anthropic documentation for latest models
- Use fallback model if primary unavailable
