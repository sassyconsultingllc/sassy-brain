# Windows Environment Variable Setup

This guide shows how to configure API keys as environment variables on Windows.

## Quick Setup (Temporary - Current Session Only)

Open PowerShell and set variables for the current session:

```powershell
$env:OPENAI_API_KEY = "sk-your-openai-key-here"
$env:GEMINI_API_KEY = "your-gemini-key-here"
$env:PERPLEXITY_API_KEY = "pplx-your-perplexity-key-here"
$env:ANTHROPIC_API_KEY = "sk-ant-your-anthropic-key-here"
$env:GROK_API_KEY = "your-grok-key-here"
$env:MANUS_API_KEY = "your-manus-key-here"
$env:OPENAI_ORG_ID = "org-your-org-id-here"  # Optional
```

**Note:** These variables will be lost when you close PowerShell.

## Permanent Setup (Recommended)

### Method 1: Using setx Command

Open Command Prompt or PowerShell **as Administrator** and run:

```cmd
setx OPENAI_API_KEY "sk-your-openai-key-here"
setx GEMINI_API_KEY "your-gemini-key-here"
setx PERPLEXITY_API_KEY "pplx-your-perplexity-key-here"
setx ANTHROPIC_API_KEY "sk-ant-your-anthropic-key-here"
setx GROK_API_KEY "your-grok-key-here"
setx MANUS_API_KEY "your-manus-key-here"
setx OPENAI_ORG_ID "org-your-org-id-here"
```

**Important:** You must restart any open applications (including Claude Desktop, PowerShell, Terminal) for the changes to take effect.

### Method 2: Using System Properties (GUI)

1. Press `Win + X` and select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables" button
4. Under "User variables" (or "System variables" for all users), click "New"
5. Add each variable:
   - Variable name: `OPENAI_API_KEY`
   - Variable value: `sk-your-openai-key-here`
6. Repeat for all API keys
7. Click "OK" to save
8. Restart applications to load new variables

### Method 3: Using PowerShell Profile (Advanced)

Edit your PowerShell profile to set variables on every PowerShell start:

```powershell
# Open profile in notepad
notepad $PROFILE

# Add these lines:
$env:OPENAI_API_KEY = "sk-your-openai-key-here"
$env:GEMINI_API_KEY = "your-gemini-key-here"
$env:PERPLEXITY_API_KEY = "pplx-your-perplexity-key-here"
$env:ANTHROPIC_API_KEY = "sk-ant-your-anthropic-key-here"
$env:GROK_API_KEY = "your-grok-key-here"
$env:MANUS_API_KEY = "your-manus-key-here"
```

## Verify Setup

Check if variables are set correctly:

```powershell
# PowerShell
echo $env:OPENAI_API_KEY
echo $env:ANTHROPIC_API_KEY

# Command Prompt
echo %OPENAI_API_KEY%
echo %ANTHROPIC_API_KEY%
```

## Security Best Practices

✅ **DO:**
- Use environment variables instead of hardcoding keys
- Use System Properties GUI for permanent, secure storage
- Keep API keys secret and never commit them to Git
- Use different keys for development vs production

❌ **DON'T:**
- Store API keys directly in code or config files
- Share API keys in chat or screenshots
- Commit .env files with actual keys to version control
- Use the same API key across multiple machines/users

## Troubleshooting

**Variables not loading after setx:**
- Restart your terminal/application completely
- Check spelling of variable names (case-sensitive in some contexts)

**Variables not persisting:**
- Use `setx` not `set` (set is temporary)
- Use System Properties GUI for guaranteed persistence

**Can't find variables:**
- Check both User and System environment variables
- Verify you restarted the application after setting them

## Where API Keys are Used

The ai-chat-history-importer skill reads these environment variables when:
- Fetching conversations via API
- Authenticating requests to AI platforms
- Parsing and importing chat histories

Scripts automatically load from environment variables using `os.getenv()` in Python.
