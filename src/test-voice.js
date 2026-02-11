#!/usr/bin/env node
/**
 * TAIA Voice Engine Test
 * Test script for voice synthesis
 */

import { VoiceEngine } from './senses/voice-engine.js';

async function runVoiceTest() {
  console.log('🔊 TAIA Voice Engine Test\n');
  console.log('═══════════════════════════════════════════════\n');

  // Initialize voice engine
  const voice = new VoiceEngine({
    backend: 'piper',  // Try piper first
    language: 'de',
    speakAloud: true,
    debug: true
  });

  // Wait for initialization
  await new Promise(r => setTimeout(r, 500));

  // Show status
  console.log('\n📊 Voice Engine Status:');
  const status = voice.getStatus();
  console.log(`  Primary Backend: ${status.primaryBackend}`);
  console.log(`  Available Backends:`);
  for (const [name, info] of Object.entries(status.backends)) {
    const installed = info.installed ? '✅' : '❌';
    console.log(`    ${installed} ${name}: ${info.name}`);
  }
  console.log(`  Language: ${status.language}`);
  console.log(`  Audio Directory: ${status.audioDirectory}\n`);

  if (!status.enabled) {
    console.log('⚠️  Voice engine is disabled. Install a TTS backend to enable.');
    console.log('\nQuick Start:');
    console.log('  Piper: pip install piper-tts');
    console.log('  gTTS: pip install gtts');
    console.log('  eSpeak: sudo apt-get install espeak-ng\n');
    return;
  }

  // Test 1: Simple sentence
  console.log('🎤 Test 1: Simple sentence');
  const test1 = await voice.speak('Ich bin TAIA. Schön, dich kennenzulernen.');
  console.log('Result:', test1);

  // Test 2: Longer text (should be truncated)
  console.log('\n🎤 Test 2: Longer text');
  const longText = 'Ich bin ein intelligenter Agent mit Sprache. ' +
    'Ich kann auf Deutsch sprechen und verstehen. ' +
    'Das ist sehr nützlich für die Benutzerinteraktion.';
  const test2 = await voice.speak(longText);
  console.log('Result:', test2);

  // Test 3: Switch backend
  if (status.backends.gtts?.installed) {
    console.log('\n🎤 Test 3: Switch to gTTS backend');
    const test3 = await voice.speak('Hallo von Google', { backend: 'gtts' });
    console.log('Result:', test3);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Voice Engine tests complete\n');
}

runVoiceTest().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
