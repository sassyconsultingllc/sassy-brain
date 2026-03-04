#!/usr/bin/env python3
"""
API Key Helper - Get API keys from environment variables or config file
Priority: Environment variables > Config file
"""

import os
import json
from pathlib import Path


def get_config_path():
    """Get path to config.json"""
    return Path(__file__).parent.parent / 'references' / 'config.json'


def load_config():
    """Load configuration from config.json"""
    with open(get_config_path()) as f:
        return json.load(f)


def get_api_key(service_name):
    """
    Get API key for a service from environment or config.
    
    Priority:
    1. Environment variable (e.g., OPENAI_API_KEY)
    2. Config file value (if not an env var placeholder)
    
    Args:
        service_name: Service name from config (anthropic, chatgpt, gemini, etc.)
    
    Returns:
        API key string or None
    
    Example:
        >>> api_key = get_api_key('anthropic')
        >>> api_key = get_api_key('chatgpt')
    """
    config = load_config()
    service_config = config.get('ai_systems', {}).get(service_name, {})
    
    # Get the environment variable name from config
    env_var_name = service_config.get('api_key', '')
    
    # Try environment variable first
    if env_var_name and env_var_name.isupper() and '_' in env_var_name:
        env_value = os.getenv(env_var_name)
        if env_value:
            return env_value
    
    # Fall back to direct value in config (for backwards compatibility)
    if env_var_name and not (env_var_name.isupper() and '_' in env_var_name):
        return env_var_name
    
    return None


def get_all_api_keys():
    """
    Get all configured API keys as a dict.
    
    Returns:
        Dict mapping service names to API keys
        
    Example:
        >>> keys = get_all_api_keys()
        >>> print(keys['anthropic'])
    """
    config = load_config()
    services = config.get('ai_systems', {})
    
    keys = {}
    for service_name in services:
        key = get_api_key(service_name)
        if key:
            keys[service_name] = key
    
    return keys


def is_service_enabled(service_name):
    """
    Check if a service is enabled in config.
    
    Args:
        service_name: Service name (anthropic, chatgpt, etc.)
    
    Returns:
        Boolean
    """
    config = load_config()
    service_config = config.get('ai_systems', {}).get(service_name, {})
    return service_config.get('enabled', False)


def get_service_config(service_name):
    """
    Get full configuration for a service including endpoint, model, etc.
    
    Args:
        service_name: Service name
    
    Returns:
        Dict with service configuration including resolved API key
    """
    config = load_config()
    service_config = config.get('ai_systems', {}).get(service_name, {})
    
    # Get API key and add it to the config
    api_key = get_api_key(service_name)
    
    result = service_config.copy()
    result['api_key'] = api_key
    
    return result


# Quick access functions for common services
def get_anthropic_key():
    """Get Anthropic/Claude API key"""
    return get_api_key('anthropic')


def get_openai_key():
    """Get OpenAI/ChatGPT API key"""
    return get_api_key('chatgpt')


def get_gemini_key():
    """Get Google Gemini API key"""
    return get_api_key('gemini')


def get_perplexity_key():
    """Get Perplexity API key"""
    return get_api_key('perplexity')


def get_grok_key():
    """Get Grok/xAI API key"""
    return get_api_key('grok')


def get_manus_key():
    """Get Manus API key"""
    return get_api_key('manus')


if __name__ == '__main__':
    """Test the API key retrieval"""
    print("Testing API Key Helper")
    print("=" * 60)
    
    services = ['anthropic', 'chatgpt', 'gemini', 'perplexity', 'grok', 'manus']
    
    for service in services:
        enabled = is_service_enabled(service)
        key = get_api_key(service)
        
        status = "✓" if key else "✗"
        key_display = f"{key[:10]}..." if key and len(key) > 10 else key or "Not set"
        enabled_str = "Enabled" if enabled else "Disabled"
        
        print(f"{status} {service:12} [{enabled_str:8}]: {key_display}")
    
    print("\nAll configured keys:")
    all_keys = get_all_api_keys()
    print(f"Found {len(all_keys)} API keys configured")
