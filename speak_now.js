#!/usr/bin/env node
/**
 * TAIA Speak-Now Test
 *
 * Einfachster möglicher Test:
 * Kann TAIA überhaupt sprechen?
 *
 * Ausführung:
 * node speak_now.js
 */

import { VoiceEngine } from './src/senses/voice-engine.js';
import { config as loadEnv } from 'dotenv';

loadEnv();

async function test() {
  console.log('🧪 TAIA Voice Test - Einfachst-Version\n');
  console.log('Erstelle VoiceEngine...');

  const voice = new VoiceEngine({
    language: 'de',
    speakAloud: true,
    debug: true,  // Alle Details zeigen
    rate: -1,
    volume: 85
  });

  console.log('✅ VoiceEngine erstellt\n');
  console.log('━'.repeat(60));
  console.log('🔊 Spreche Test-Nachricht...\n');
  console.log('━'.repeat(60));

  const testMessages = [
    'Hallo! Ich bin TAIA. Kann du mich hören?',
    'Dies ist ein Voice-Test auf der System-Ebene.',
    'Wenn du das hörst, funktioniert die Sprachausgabe.'
  ];

  for (const msg of testMessages) {
    console.log(`\n📢 Spreche: "${msg}"`);
    await voice.speak(msg);

    // Kurze Pause zwischen Meldungen
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '━'.repeat(60));
  console.log('✅ Test abgeschlossen!');
  console.log('━'.repeat(60));

  console.log('\nStatus:');
  console.log(JSON.stringify(voice.getStatus(), null, 2));

  console.log('\n🎯 Ergebnis:');
  console.log('  ✅ Wenn du die Meldungen gehört hast → Voice funktioniert!');
  console.log('  ❌ Wenn du NICHTS gehört hast → Siehe Troubleshooting unten\n');

  console.log('Troubleshooting:');
  console.log('1. Überprüfe Lautstärke (Windows Volume Mixer)');
  console.log('2. Stelle sicher, dass Speakers aktiviert sind');
  console.log('3. Führe folgendes aus:');
  console.log('   PowerShell: (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("Test")\n');
}

test().catch(err => {
  console.error('❌ Fehler:', err.message);
  process.exit(1);
});
