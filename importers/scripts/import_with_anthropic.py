#!/usr/bin/env python3
"""
Import and Continue Conversations with Anthropic API
Loads conversation history and continues with Claude API
"""

import json
import os
import sys
from pathlib import Path

# Try to import anthropic, gracefully handle if not installed
try:
    from anthropic import Anthropic, RateLimitError
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    print("Warning: anthropic package not installed. Install with: pip install anthropic --break-system-packages")


def load_config():
    """Load configuration from config.json"""
    config_path = Path(__file__).parent.parent / 'references' / 'config.json'
    with open(config_path) as f:
        return json.load(f)


def get_api_key(config, service_name, env_var_name):
    """
    Get API key from environment variable or config file.
    Environment variables take precedence.
    
    Args:
        config: Configuration dict from config.json
        service_name: Name of the service in config (e.g., 'anthropic', 'chatgpt')
        env_var_name: Environment variable name (from config file)
    
    Returns:
        API key string or None
    """
    # First try environment variable
    env_key = os.getenv(env_var_name)
    if env_key:
        return env_key
    
    # Fall back to config file (for backwards compatibility)
    service_config = config.get('ai_systems', {}).get(service_name, {})
    config_key = service_config.get('api_key', '')
    
    # If config key looks like an env var name, try to get it from environment
    if config_key and config_key.isupper() and '_' in config_key:
        return os.getenv(config_key)
    
    return config_key if config_key else None


def import_and_continue(history_file, question, config=None):
    """
    Import conversation history and continue with Claude API.
    
    Args:
        history_file: Path to conversation history JSON
        question: New question to ask
        config: Configuration dict (optional, loads from file if not provided)
    
    Returns:
        Claude's response text
    """
    if not ANTHROPIC_AVAILABLE:
        return "Error: anthropic package not installed"
    
    # Load config
    if config is None:
        config = load_config()
    
    anthropic_config = config.get('ai_systems', {}).get('anthropic', {})
    
    if not anthropic_config.get('enabled'):
        return "Error: Anthropic API not enabled in config.json"
    
    # Get API key from environment or config
    api_key = get_api_key(config, 'anthropic', 'ANTHROPIC_API_KEY')
    
    if not api_key:
        return "Error: No API key found. Set ANTHROPIC_API_KEY environment variable or add to references/config.json"
    
    # Initialize client
    client = Anthropic(api_key=api_key)
    
    # Load conversation history
    history_path = Path(history_file)
    if not history_path.exists():
        return f"Error: History file not found: {history_file}"
    
    with open(history_path) as f:
        history = json.load(f)
    
    # Build messages array
    messages = []
    
    # Check if history has messages key or is array directly
    history_messages = history.get('messages', history if isinstance(history, list) else [])
    
    for msg in history_messages:
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        
        if content:
            messages.append({
                'role': role,
                'content': content
            })
    
    # Add new question
    messages.append({
        'role': 'user',
        'content': question
    })
    
    # Get model and max_tokens from config
    model = anthropic_config.get('model', 'claude-sonnet-4-20250514')
    max_tokens = anthropic_config.get('max_tokens', 4096)
    
    # Send to Claude with retry logic
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=messages
            )
            
            return response.content[0].text
            
        except RateLimitError as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"Rate limit hit. Waiting {wait_time}s before retry...")
                import time
                time.sleep(wait_time)
            else:
                return f"Error: Rate limit exceeded after {max_retries} attempts"
        except Exception as e:
            return f"Error: {str(e)}"


def main():
    """CLI interface"""
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python import_with_anthropic.py <history_file> <question>")
        print("")
        print("Example:")
        print("  python import_with_anthropic.py conversation.json 'Help me optimize this code'")
        print("")
        print("Prerequisites:")
        print("  1. pip install anthropic --break-system-packages")
        print("  2. Set environment variable: ANTHROPIC_API_KEY=your-key-here")
        print("     OR add your API key to references/config.json")
        print("  3. Set enabled: true for anthropic in config.json")
        sys.exit(1)
    
    history_file = sys.argv[1]
    question = sys.argv[2]
    
    print(f"Loading conversation from: {history_file}")
    print(f"Question: {question}")
    print("-" * 60)
    
    result = import_and_continue(history_file, question)
    
    print(result)


if __name__ == '__main__':
    main()
