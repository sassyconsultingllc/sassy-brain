#!/bin/bash
# Quick config finder for AI Chat History Importer
# Works on macOS, Linux, and Windows (via Git Bash)

set -e

echo "======================================================================"
echo "AI Chat History Importer - Config File Locator"
echo "======================================================================"
echo ""

# Detect OS and set config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CONFIG_PATH="$HOME/Library/Application Support/Claude/skills/ai-chat-history-importer/references/config.json"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash)
    CONFIG_PATH="$APPDATA/Claude/skills/ai-chat-history-importer/references/config.json"
else
    # Linux
    CONFIG_PATH="$HOME/.config/Claude/skills/ai-chat-history-importer/references/config.json"
fi

echo "Looking for config at:"
echo "  $CONFIG_PATH"
echo ""

if [ ! -f "$CONFIG_PATH" ]; then
    echo "❌ Config file not found!"
    echo ""
    echo "The skill might not be installed yet."
    echo ""
    echo "To install:"
    echo "  1. Open Claude Desktop"
    echo "  2. Settings > Skills"
    echo "  3. Install ai-chat-history-importer.skill"
    echo ""
    
    # Try to find it
    echo "Searching for config file..."
    find ~ -name "config.json" -path "*/ai-chat-history-importer/references/*" 2>/dev/null | head -5
    
    exit 1
fi

echo "✓ Config file found!"
echo ""

# Open file based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "$CONFIG_PATH"
    echo "Opened in default editor"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    start "$CONFIG_PATH"
    echo "Opened in default editor"
else
    # Linux - try various editors
    if command -v xdg-open &> /dev/null; then
        xdg-open "$CONFIG_PATH"
        echo "Opened in default editor"
    elif command -v gedit &> /dev/null; then
        gedit "$CONFIG_PATH" &
        echo "Opened in gedit"
    elif command -v kate &> /dev/null; then
        kate "$CONFIG_PATH" &
        echo "Opened in kate"
    elif command -v nano &> /dev/null; then
        nano "$CONFIG_PATH"
    else
        echo "Could not find a text editor."
        echo "Please open manually:"
        echo "  $CONFIG_PATH"
    fi
fi

echo ""
echo "After editing:"
echo "  1. Add your API keys (sk-ant-... or sk-proj-...)"
echo "  2. Set 'enabled: true' for systems you want to use"
echo "  3. Save and close"
echo ""
echo "Example:"
echo '  "anthropic": {'
echo '    "enabled": true,'
echo '    "api_key": "sk-ant-api03-your-key-here",'
echo '    ...'
echo '  }'
echo ""
echo "Done!"
