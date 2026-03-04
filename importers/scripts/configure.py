#!/usr/bin/env python3
"""
Find and open the AI Chat History Importer config file
Works on macOS, Windows, and Linux
"""

import os
import sys
import platform
import subprocess
from pathlib import Path


def get_config_path():
    """Get the config.json path based on OS"""
    system = platform.system()
    
    if system == "Darwin":  # macOS
        base = Path.home() / "Library" / "Application Support" / "Claude"
    elif system == "Windows":
        base = Path(os.environ.get('APPDATA', '')) / "Claude"
    else:  # Linux
        base = Path.home() / ".config" / "Claude"
    
    config_path = base / "skills" / "ai-chat-history-importer" / "references" / "config.json"
    
    return config_path


def open_file(filepath):
    """Open file in default editor based on OS"""
    system = platform.system()
    
    try:
        if system == "Darwin":  # macOS
            subprocess.run(['open', str(filepath)])
        elif system == "Windows":
            os.startfile(str(filepath))
        else:  # Linux
            # Try various editors in order of preference
            editors = ['xdg-open', 'gedit', 'kate', 'nano', 'vim', 'vi']
            for editor in editors:
                try:
                    subprocess.run([editor, str(filepath)])
                    break
                except FileNotFoundError:
                    continue
    except Exception as e:
        print(f"Could not open file automatically: {e}")
        print(f"Please open manually: {filepath}")


def main():
    print("="*60)
    print("AI Chat History Importer - Config File Locator")
    print("="*60)
    print()
    
    config_path = get_config_path()
    
    print(f"Looking for config at: {config_path}")
    print()
    
    if not config_path.exists():
        print("❌ Config file not found!")
        print()
        print("Possible reasons:")
        print("1. Skill not installed yet")
        print("2. Skill installed in different location")
        print("3. Different Claude installation")
        print()
        print("Expected location:")
        print(f"  {config_path}")
        print()
        print("To install the skill:")
        print("  1. Open Claude Desktop")
        print("  2. Go to Settings > Skills")
        print("  3. Install ai-chat-history-importer.skill")
        print()
        
        # Search for config in common locations
        print("Searching for config file...")
        home = Path.home()
        found = []
        
        for search_path in [home / "Library", home / "AppData", home / ".config", home]:
            if search_path.exists():
                for config in search_path.rglob("ai-chat-history-importer/references/config.json"):
                    found.append(config)
        
        if found:
            print(f"\nFound {len(found)} possible location(s):")
            for i, path in enumerate(found, 1):
                print(f"  {i}. {path}")
            print()
            choice = input("Open one of these? (enter number or 'n' to exit): ").strip()
            if choice.isdigit() and 1 <= int(choice) <= len(found):
                config_path = found[int(choice) - 1]
                print(f"\nOpening: {config_path}")
                open_file(config_path)
                return
        
        sys.exit(1)
    
    print("✓ Config file found!")
    print()
    print("Current configuration:")
    print("-" * 60)
    
    # Read and display current config (without showing API keys)
    try:
        import json
        with open(config_path) as f:
            config = json.load(f)
        
        for system_name, system_config in config.get('ai_systems', {}).items():
            enabled = system_config.get('enabled', False)
            has_key = bool(system_config.get('api_key', '').strip())
            status = "✓ Configured" if (enabled and has_key) else "○ Not configured"
            print(f"  {system_name:15} {status}")
        
        print("-" * 60)
        print()
    except Exception as e:
        print(f"Could not read config: {e}")
        print()
    
    print("What would you like to do?")
    print("  1. Show how to use environment variables (RECOMMENDED)")
    print("  2. Open config file (local dev only - not secure)")
    print("  3. Show full path only")
    print("  4. Exit")
    print()
    
    choice = input("Choice (1-4): ").strip()
    
    if choice == "1":
        print()
        print("="*60)
        print("RECOMMENDED: Use Environment Variables")
        print("="*60)
        print()
        print("Add to your shell profile:")
        print()
        if platform.system() == "Windows":
            print("  # Windows (Git Bash ~/.bashrc or System Variables)")
            print("  export ANTHROPIC_API_KEY='sk-ant-api03-your-key'")
            print("  export OPENAI_API_KEY='sk-proj-your-key'")
        else:
            print("  # ~/.bashrc or ~/.zshrc or ~/.bash_profile")
            print("  export ANTHROPIC_API_KEY='sk-ant-api03-your-key'")
            print("  export OPENAI_API_KEY='sk-proj-your-key'")
        print()
        print("Then reload:")
        print("  source ~/.bashrc")
        print()
        print("Scripts automatically read from environment variables.")
        print("Keys never touch the filesystem.")
        print()
        
    elif choice == "2":
        print()
        print("⚠️  WARNING: Config file is NOT secure for production")
        print()
        print("This stores keys in plaintext on disk.")
        print("Easy to accidentally commit to git or share.")
        print()
        cont = input("Continue anyway? (y/n): ").strip().lower()
        if cont != 'y':
            print("Good choice. Use environment variables instead.")
            sys.exit(0)
        
        print(f"\nOpening: {config_path}")
        open_file(config_path)
        print()
        print("After editing:")
        print("  1. Add your API keys")
        print("  2. Set 'enabled: true' for systems you want")
        print("  3. Save and close")
        print("  4. chmod 600 config.json")
        print()
        print("⚠️  DO NOT share this file or commit to git!")
        
    elif choice == "3":
        print(f"\nConfig location: {config_path}")
        
        # Copy to clipboard if possible
        try:
            import pyperclip
            pyperclip.copy(str(config_path))
            print("✓ Copied to clipboard!")
        except ImportError:
            pass
    
    print()
    print("Done!")


if __name__ == '__main__':
    main()
