#!/usr/bin/env node
/**
 * Sassy Brain — CLI Key Setup
 * Run: node scripts/setup-keys.js
 * 
 * Sets Windows environment variables for API keys.
 * Also configurable via the in-app setup screen.
 */

const readline = require('readline');
const { execSync } = require('child_process');
const os = require('os');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

const KEYS = [
  {
    name: 'Anthropic (Claude)',
    envVar: 'ANTHROPIC_API_KEY',
    prefix: 'sk-ant-',
    url: 'https://console.anthropic.com/settings/keys',
    required: true
  },
  {
    name: 'xAI (Grok)',
    envVar: 'GROK_API_KEY',
    prefix: 'xai-',
    url: 'https://console.x.ai/',
    required: true
  },
  {
    name: 'GitHub',
    envVar: 'GITHUB_TOKEN',
    prefix: 'ghp_',
    url: 'https://github.com/settings/tokens',
    required: false
  }
];

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       SASSY BRAIN — Key Setup        ║');
  console.log('║   Sassy Consulting LLC  © 2026       ║');
  console.log('╚══════════════════════════════════════╝\n');

  console.log('This will set environment variables for your API keys.');
  console.log('Keys are stored at the OS level and encrypted in-app.\n');

  for (const key of KEYS) {
    const tag = key.required ? '[REQUIRED]' : '[optional]';
    console.log(`\n${tag} ${key.name}`);
    console.log(`  Get your key at: ${key.url}`);

    const existing = process.env[key.envVar];
    if (existing) {
      console.log(`  Current: ••••${existing.slice(-4)}`);
      const update = await ask('  Update? (y/N): ');
      if (update.toLowerCase() !== 'y') continue;
    }

    const value = await ask(`  Enter ${key.name} key (or press Enter to skip): `);
    if (!value.trim()) {
      console.log('  Skipped.');
      continue;
    }

    if (os.platform() === 'win32') {
      try {
        execSync(`setx ${key.envVar} "${value.trim()}"`, { stdio: 'pipe' });
        console.log(`  ✓ Set ${key.envVar} (restart terminal to use)`);
      } catch (err) {
        console.log(`  ✗ Failed to set: ${err.message}`);
        console.log(`  Manual: setx ${key.envVar} "your-key-here"`);
      }
    } else {
      // Linux/Mac: append to shell profile
      const profile = os.platform() === 'darwin' ? '~/.zshrc' : '~/.bashrc';
      console.log(`  Add to ${profile}:`);
      console.log(`  export ${key.envVar}="${value.trim()}"`);
    }
  }

  console.log('\n✓ Setup complete.');
  console.log('  Run "npm start" to launch Sassy Brain.\n');
  rl.close();
}

main().catch(err => {
  console.error('Setup error:', err);
  rl.close();
  process.exit(1);
});
