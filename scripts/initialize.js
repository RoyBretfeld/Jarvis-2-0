#!/usr/bin/env node

/**
 * GEM Configuration Manager - Initialization Script
 *
 * Guides first-time setup of the agent system
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const CONFIG_DIR = path.join(process.cwd(), '.agent-data');
const ENV_FILE = path.join(process.cwd(), '.env');
const ENV_EXAMPLE = path.join(process.cwd(), '.env.example');

async function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function initialize() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   GEM Configuration Manager Setup      ║');
  console.log('║   Interactive Initialization Script    ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    // Step 1: Check prerequisites
    console.log('📍 Step 1: Checking prerequisites...\n');
    checkPrerequisites();

    // Step 2: Create configuration directory
    console.log('\n📍 Step 2: Creating data directories...\n');
    await createDataDirectories();

    // Step 3: Setup .env file
    console.log('\n📍 Step 3: Configuring environment...\n');
    await setupEnvironment();

    // Step 4: Configure channels
    console.log('\n📍 Step 4: Setting up communication channels...\n');
    await setupChannels();

    // Step 5: Verify setup
    console.log('\n📍 Step 5: Verifying configuration...\n');
    await verifySetup();

    // Success
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    ✅ Setup Complete!                 ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('Next steps:');
    console.log('1. npm start           - Start the agent');
    console.log('2. Check .env          - Verify configuration');
    console.log('3. Read README.md      - Learn more\n');

    rl.close();
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    rl.close();
    process.exit(1);
  }
}

function checkPrerequisites() {
  console.log('✓ Node.js version:', process.version);
  console.log('✓ npm version:', execSync('npm --version').toString().trim());
  console.log('✓ Working directory:', process.cwd());

  if (!fs.existsSync(ENV_EXAMPLE)) {
    throw new Error('.env.example not found');
  }
  console.log('✓ .env.example found');
}

async function createDataDirectories() {
  const dirs = [
    CONFIG_DIR,
    path.join(CONFIG_DIR, 'memories'),
    path.join(CONFIG_DIR, 'souls'),
    path.join(CONFIG_DIR, 'logs')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created: ${dir}`);
    } else {
      console.log(`✓ Exists: ${dir}`);
    }
  }
}

async function setupEnvironment() {
  if (fs.existsSync(ENV_FILE)) {
    const overwrite = await question('⚠️  .env already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Keeping existing .env');
      return;
    }
  }

  const groqKey = await question('🔑 Enter your Groq API Key (or press Enter to skip): ');

  let envContent = fs.readFileSync(ENV_EXAMPLE, 'utf-8');

  if (groqKey) {
    envContent = envContent.replace(
      'GROQ_API_KEY=your_groq_api_key_here',
      `GROQ_API_KEY=${groqKey}`
    );
  }

  fs.writeFileSync(ENV_FILE, envContent);
  console.log('✓ .env file created');

  if (!groqKey) {
    console.log('⚠️  Groq API key not set. Get one from https://console.groq.com');
  }
}

async function setupChannels() {
  const channels = [
    { name: 'Telegram', env: 'TELEGRAM_ENABLED' },
    { name: 'Discord', env: 'DISCORD_ENABLED' },
    { name: 'WhatsApp', env: 'WHATSAPP_ENABLED' },
    { name: 'Slack', env: 'SLACK_ENABLED' }
  ];

  console.log('Available channels:');
  for (let i = 0; i < channels.length; i++) {
    console.log(`${i + 1}. ${channels[i].name}`);
  }

  const enableChannels = await question('\nEnable channels? (1-4 separated by comma, or press Enter to skip): ');

  if (enableChannels) {
    const selected = enableChannels.split(',').map(x => parseInt(x.trim()) - 1);

    let envContent = fs.readFileSync(ENV_FILE, 'utf-8');

    for (const idx of selected) {
      if (idx >= 0 && idx < channels.length) {
        const channel = channels[idx];
        envContent = envContent.replace(
          new RegExp(`${channel.env}=false`),
          `${channel.env}=true`
        );
        console.log(`✓ Enabled: ${channel.name}`);
      }
    }

    fs.writeFileSync(ENV_FILE, envContent);
  }

  console.log('✓ Channel configuration complete');
  console.log('  (Configure specific tokens later in .env)\n');
}

async function verifySetup() {
  const checks = {
    '.env exists': fs.existsSync(ENV_FILE),
    'Data directories exist': fs.existsSync(CONFIG_DIR),
    'node_modules exists': fs.existsSync(path.join(process.cwd(), 'node_modules')),
    'package.json exists': fs.existsSync(path.join(process.cwd(), 'package.json'))
  };

  console.log('Verification:');
  for (const [check, result] of Object.entries(checks)) {
    console.log(`${result ? '✓' : '✗'} ${check}`);
  }

  if (!Object.values(checks).every(v => v)) {
    throw new Error('Verification failed');
  }

  console.log('\n✓ All systems verified');
}

// Run initialization
initialize().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
