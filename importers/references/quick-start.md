# Quick Start Guide

## First Time Setup

1. **Configure API Keys** (optional, only if you want to fetch conversations via API)
   - Tell Claude: "I want to add my ChatGPT API key"
   - Provide your API key when prompted
   - Claude will update `references/config.json` for you

2. **Test the Parser** (optional)
   ```bash
   python3 scripts/parse_chat_history.py assets/example_conversation.md
   ```

## Importing a Conversation

### Method 1: Copy & Paste
```
Just paste your conversation in the chat and say:
"Here's my conversation with ChatGPT about [topic]. Can you continue from here?"
```

### Method 2: File Upload
```
1. Export your conversation from the other AI system
2. Upload the file to Claude
3. Say: "Please import this chat history and help me continue"
```

### Method 3: API Fetch (requires API key)
```
"Fetch my ChatGPT conversation with ID abc-123"
```

## Common Use Cases

**Continue a technical discussion:**
> "Here's my conversation with Gemini about database optimization. I'm stuck on the indexing strategy."

**Compare approaches:**
> "I discussed this problem with both ChatGPT and Perplexity. Here are both conversations. Which approach do you think is better?"

**Get a second opinion:**
> "ChatGPT suggested this solution [paste conversation]. What's your take on it?"

**Preserve context across sessions:**
> "I started working on this project with you last week on my phone. Here's that conversation. Let's continue on desktop."

**Import Manus automation session:**
> "Here's my Manus browser automation session where I was scraping product data. Can you help me optimize the selectors?"

**Continue from Grok:**
> "I had this conversation with Grok about quantum computing. I need you to help me implement the code examples."

## Supported Formats

- ✅ Plain text (alternating format)
- ✅ JSON (ChatGPT, Gemini, Grok, Manus, generic)
- ✅ Markdown (with or without frontmatter)
- ✅ Timestamped conversations
- ✅ Code-heavy discussions
- ✅ Manus browser automation logs
- ✅ Grok/X.AI conversations

## Tips

- Include context about what you want to do with the imported conversation
- Specify which parts of the conversation are most relevant
- If the conversation is very long, you can ask Claude to summarize it first
- You can import multiple conversations and ask Claude to synthesize them
