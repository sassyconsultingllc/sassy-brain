---
name: ai-chat-history-importer
description: Import and integrate chat histories from other AI systems (ChatGPT, Gemini, Perplexity, etc.) into current Claude conversations. Use when the user wants to reference previous conversations from other AI assistants, continue discussions from other platforms, or maintain context across different AI systems. Includes API key management and conversation format handling.
---

# AI Chat History Importer

This skill enables Claude to understand and incorporate chat histories from other AI systems, maintaining conversation continuity across platforms.

## Supported AI Systems

- ChatGPT (OpenAI)
- Gemini (Google)
- Perplexity
- Grok (xAI)
- Manus (browser automation conversations)
- Claude/Anthropic (via API)
- Other AI chat systems (generic format)

## How It Works

### 1. Configuration Setup

API keys are now loaded from **Windows environment variables** for better security. The config.json file specifies which environment variables to use.

**Quick Setup (Recommended):**

1. Set environment variables in Windows (permanent):
```cmd
setx ANTHROPIC_API_KEY "sk-ant-your-key-here"
setx OPENAI_API_KEY "sk-your-openai-key-here"
setx GEMINI_API_KEY "your-gemini-key-here"
setx PERPLEXITY_API_KEY "pplx-your-key-here"
setx GROK_API_KEY "your-grok-key-here"
setx MANUS_API_KEY "your-manus-key-here"
```

2. Restart Claude Desktop (or any terminal) to load the new environment variables

**See `WINDOWS_ENV_SETUP.md` for detailed setup instructions including:**
- GUI method using System Properties
- Temporary vs permanent configuration
- PowerShell profile setup
- Troubleshooting

**Alternative - Manual config.json editing:**

If you prefer to store keys directly in the config file (less secure):
1. Read the config template from `references/config.json`
2. Replace environment variable names with actual API keys
3. Save the file

**Note:** Environment variables take precedence over config.json values.

### 2. Importing Chat History

**IMPORTANT: NO TRUNCATION - ALL conversation content is preserved.**

For very long conversations, the skill automatically chunks them into separate attachment files. Each chunk is a complete, readable file. You can review them individually or Claude can process all chunks to understand the full context.

When a user wants to import a chat history, they can:

**Option A: Direct Paste**
- Paste the conversation directly into the chat
- Specify which AI system it came from
- Claude will parse and integrate it

**Option B: File Upload**
- Export chat from the other AI system (JSON, TXT, or markdown format)
- Upload the file to Claude
- Claude will parse and integrate it

**Option C: API Fetch** (if configured)
- Provide the conversation ID from the other platform
- Claude will use the configured API key to fetch the conversation
- Automatically parse and integrate it

### 3. Format Handling

Claude will automatically detect and parse these formats:

#### ChatGPT Format
```json
{
  "title": "Conversation Title",
  "messages": [
    {"role": "user", "content": "User message"},
    {"role": "assistant", "content": "Assistant response"}
  ]
}
```

#### Generic Format
```markdown
User: Message here
Assistant: Response here
User: Another message
Assistant: Another response
```

#### Structured Format (Recommended)
```yaml
---
source: chatgpt|gemini|perplexity|other
date: YYYY-MM-DD
topic: Brief description
---
[Conversation content follows]
```

## Usage Patterns

### Referencing Imported Context

Once a conversation is imported, Claude will:

1. **Acknowledge the import**: "I've reviewed your conversation from [AI System] about [topic]"
2. **Extract key context**: Identify main topics, decisions, code snippets, or unresolved questions
3. **Integrate seamlessly**: Reference the imported context naturally when relevant
4. **Continue the thread**: Pick up where the previous conversation left off

### Example Usage

**User**: "Here's my conversation with ChatGPT about building a Python web scraper. Can you help me finish it?"

**Claude**:
1. Reads the imported conversation
2. Identifies what was discussed (libraries, approach, blockers)
3. Identifies what remains (error handling, deployment)
4. Continues working on the project with full context

## API Key Management

### Security Best Practices

- API keys are stored in `references/config.json` (local to this skill)
- Keys are never exposed in chat responses
- Keys are only used when explicitly requested by the user
- Users can update or remove keys at any time

### Configuration Commands

**View current config** (shows which environment variables are expected):
- "Show me my AI chat importer config"
- This shows the environment variable names, not the actual keys

**Set environment variables** (Windows):
```cmd
setx OPENAI_API_KEY "sk-your-key-here"
setx ANTHROPIC_API_KEY "sk-ant-your-key-here"
```

**Verify environment variables**:
```powershell
echo $env:OPENAI_API_KEY
echo $env:ANTHROPIC_API_KEY
```

**Alternative - Direct config editing** (less secure):
- Edit `references/config.json` and replace environment variable names with actual keys
- Claude can help you edit the config file if needed

**Test API key helper**:
```bash
python scripts/api_key_helper.py
```

## Advanced Features

### Conversation Chunking (NO TRUNCATION)

For conversations exceeding ~50,000 characters, the skill automatically chunks them into multiple files:

**How it works:**
1. Parses the entire conversation (no truncation)
2. Splits into logical chunks preserving message boundaries
3. Creates separate attachment files (part1of3.json, part2of3.json, etc.)
4. Generates a conversation_map.json showing the structure
5. Claude can process all chunks to understand full context

**Usage:**
```bash
# Chunk a large conversation
python3 scripts/chunk_conversation.py huge_conversation.txt ./output

# Custom chunk size (characters)
python3 scripts/chunk_conversation.py huge_conversation.txt ./output 100000
```

**In Chat:**
Simply upload all chunk files together, or upload them one at a time. Claude will recognize they're parts of the same conversation and maintain context across all chunks.

### Cross-Platform Synthesis

When multiple conversations from different AI systems are imported, Claude can:
- Compare different AI approaches to the same problem
- Synthesize the best ideas from multiple sources
- Identify contradictions or areas needing clarification

### Context Preservation

Imported conversations maintain:
- Original timestamps and sequence
- Code blocks and formatting
- Links and references
- Unresolved questions or action items

### Smart Integration

Claude intelligently:
- Detects when imported context is relevant to current discussion
- Avoids repeating information already covered
- Highlights where the previous AI left off or got stuck
- Suggests next steps based on conversation history

## File References

- `references/config.json` - Environment variable names and system configuration
- `references/WINDOWS_ENV_SETUP.md` - Complete guide to setting up environment variables on Windows
- `references/format-examples.md` - Additional format examples and parsing rules
- `references/anthropic-api.md` - Anthropic API integration guide and examples
- `scripts/api_key_helper.py` - Reusable module for getting API keys from environment or config
- `scripts/parse_chat_history.py` - Chat history parser utility
- `scripts/chunk_conversation.py` - Chunks long conversations into multiple files (NO TRUNCATION)
- `scripts/import_with_anthropic.py` - Import conversations and continue with Claude API

## Privacy & Security Notes

- **API keys stored as environment variables** - More secure than storing in files
- Imported conversations are only accessible within the current Claude session
- No conversation data is transmitted to third parties unless you use API fetch features
- Users maintain full control over what context is shared
- Environment variables are system-level and persist across sessions
- Never commit API keys to version control or share them in chat

## Tips for Best Results

1. **Set up environment variables first**: Follow `WINDOWS_ENV_SETUP.md` to configure API keys securely
2. **Restart applications**: After setting environment variables with `setx`, restart Claude Desktop or terminal
3. **Provide context**: Briefly describe what the imported conversation was about
4. **Specify the goal**: Tell Claude what you want to accomplish with the imported context
5. **Be explicit**: If you want Claude to critique or improve on the previous AI's approach, say so
6. **Test your setup**: Run `python scripts/api_key_helper.py` to verify API keys are loaded correctly

## Limitations

- Cannot automatically fetch conversations without API keys
- Some AI platforms may not provide export functionality
- Very long conversations may need to be summarized or split
- Real-time syncing across platforms is not supported
