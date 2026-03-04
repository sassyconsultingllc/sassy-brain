# Configuring API Keys

## Quick Start

After installing the skill, run the configure script:

```bash
# Python version (recommended - works everywhere)
python scripts/configure.py

# Bash version (macOS/Linux/Git Bash on Windows)
bash scripts/configure.sh
```

The script will:
1. Find your config file
2. Open it in your default editor
3. Show you what to edit

## Manual Configuration

### Step 1: Find the Config File

**macOS:**
```
~/Library/Application Support/Claude/skills/ai-chat-history-importer/references/config.json
```

**Windows:**
```
C:\Users\YourName\AppData\Roaming\Claude\skills\ai-chat-history-importer\references\config.json
```

**Linux:**
```
~/.config/Claude/skills/ai-chat-history-importer/references/config.json
```

### Step 2: Edit Config

Open `config.json` and add your API keys:

```json
{
  "ai_systems": {
    "anthropic": {
      "enabled": true,
      "api_key": "sk-ant-api03-your-actual-key",
      "model": "claude-sonnet-4-20250514",
      "max_tokens": 4096
    },
    "chatgpt": {
      "enabled": true,
      "api_key": "sk-proj-your-actual-key",
      "organization_id": ""
    },
    "gemini": {
      "enabled": false,
      "api_key": ""
    }
  }
}
```

### Step 3: Get API Keys

**Anthropic (Claude):**
https://console.anthropic.com/settings/keys

**OpenAI (ChatGPT):**
https://platform.openai.com/api-keys

**Google (Gemini):**
https://makersuite.google.com/app/apikey

**xAI (Grok):**
https://console.x.ai/

## Security Best Practices

### Option 1: Environment Variables (REQUIRED for Production)

**This is the ONLY secure method:**

Add to your shell profile:

```bash
# ~/.bashrc or ~/.zshrc or ~/.bash_profile
export ANTHROPIC_API_KEY="sk-ant-api03-..."
export OPENAI_API_KEY="sk-proj-..."
export GOOGLE_API_KEY="..."
```

Scripts check environment variables FIRST, before config.json.

**Why this is better:**
- Keys never written to disk
- Can't accidentally commit to git
- Can't accidentally share
- Proper separation of code and secrets

### Option 2: Config File (Local Development ONLY)

**⚠️ WARNING: NOT SECURE FOR PRODUCTION**

- Edit config.json directly
- Keep file permissions restricted (`chmod 600`)
- NEVER commit to git (add to .gitignore)
- NEVER share the configured skill
- Easy to accidentally expose

### Option 3: Secrets Manager (Production Systems)

Use a proper secrets manager:
- AWS Secrets Manager
- HashiCorp Vault
- 1Password CLI
- Azure Key Vault

## Troubleshooting

**"Config file not found"**
- Skill may not be installed yet
- Check Claude Desktop > Settings > Skills
- Run configure script to search for it

**"Permission denied"**
```bash
chmod 600 config.json
```

**"API key invalid"**
- Check key format (starts with `sk-ant-` or `sk-proj-`)
- Verify key is active in provider console
- Check for extra spaces/newlines

**"Rate limit exceeded"**
- Add delays between requests
- Use exponential backoff (built into scripts)
- Upgrade API tier if needed

## Testing Your Config

```bash
# Test Anthropic API
python scripts/import_with_anthropic.py test.json "test question"

# Test with actual conversation
python scripts/parse_chat_history.py conversation.txt
python scripts/import_with_anthropic.py output.json "continue this"
```

## File Permissions

Recommended permissions:

```bash
# Config file (contains secrets)
chmod 600 config.json

# Scripts (need to be executable)
chmod 755 scripts/*.py scripts/*.sh

# Everything else
chmod 644 *.md
```

## Updating Keys

To rotate API keys:

1. Generate new key in provider console
2. Update config.json
3. Revoke old key in provider console
4. Test with new key

## Questions?

Run the configure script for interactive help:
```bash
python scripts/configure.py
```
