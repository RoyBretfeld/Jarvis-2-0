#!/usr/bin/env node

/**
 * GEM Configuration Manager - Status Check Script
 *
 * Displays system status and configuration
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function checkStatus() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║    GEM Configuration Manager Status   ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 1. Environment checks
  console.log('📋 Environment:');
  console.log(`  Node.js:        ${process.version}`);
  console.log(`  npm:            ${execSync('npm --version').toString().trim()}`);
  console.log(`  Platform:       ${os.platform()} (${os.arch()})`);
  console.log(`  Working Dir:    ${process.cwd()}\n`);

  // 2. Configuration files
  console.log('📂 Configuration Files:');
  const files = {
    '.env': '.env',
    'package.json': 'package.json',
    'package-lock.json': 'package-lock.json',
    'README.md': 'README.md',
    'OPENCLAW_DOCUMENTATION.md': 'OPENCLAW_DOCUMENTATION.md'
  };

  for (const [name, filePath] of Object.entries(files)) {
    const exists = fs.existsSync(filePath);
    console.log(`  ${exists ? '✓' : '✗'} ${name}`);
  }
  console.log();

  // 3. Dependencies
  console.log('📦 Dependencies:');
  const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const deps = pkgJson.dependencies || {};

  for (const [name, version] of Object.entries(deps)) {
    const installed = fs.existsSync(path.join('node_modules', name));
    console.log(`  ${installed ? '✓' : '✗'} ${name}@${version}`);
  }
  console.log();

  // 4. Agent data
  console.log('🧠 Agent Data:');
  const dataDir = path.join(process.cwd(), '.agent-data');
  const memoryDir = path.join(dataDir, 'memories');
  const soulDir = path.join(dataDir, 'souls');

  const stats = {
    'Data Directory': fs.existsSync(dataDir),
    'Memories': fs.existsSync(memoryDir),
    'Souls': fs.existsSync(soulDir)
  };

  for (const [name, exists] of Object.entries(stats)) {
    console.log(`  ${exists ? '✓' : '✗'} ${name}`);
  }

  // Count stored data
  if (fs.existsSync(memoryDir)) {
    const files = fs.readdirSync(memoryDir).length;
    console.log(`  Memory files: ${files}`);
  }
  if (fs.existsSync(soulDir)) {
    const files = fs.readdirSync(soulDir).length;
    console.log(`  Soul backups: ${files}`);
  }
  console.log();

  // 5. API Configuration
  console.log('🔑 API Configuration:');
  const groqKey = process.env.GROQ_API_KEY || 'NOT SET';
  console.log(`  GROQ_API_KEY:      ${groqKey === 'NOT SET' ? '❌ NOT SET' : '✓ Configured'}`);
  console.log();

  // 6. Channel Configuration
  console.log('🌐 Channels:');
  const channels = {
    'Telegram': process.env.TELEGRAM_ENABLED === 'true',
    'WhatsApp': process.env.WHATSAPP_ENABLED === 'true',
    'Discord': process.env.DISCORD_ENABLED === 'true',
    'Slack': process.env.SLACK_ENABLED === 'true',
    'Google Chat': process.env.GOOGLE_CHAT_ENABLED === 'true'
  };

  for (const [name, enabled] of Object.entries(channels)) {
    console.log(`  ${enabled ? '✓' : '○'} ${name}`);
  }
  console.log();

  // 7. Summary
  console.log('═'.repeat(40));
  const allGood = Object.values(stats).every(v => v) && groqKey !== 'NOT SET';

  if (allGood) {
    console.log('✅ System Ready!');
    console.log('\nRun: npm start');
  } else {
    console.log('⚠️  Setup Required');
    console.log('\nRun: npm run init');
  }
  console.log();
}

checkStatus();
