/**
 * Voice Routes - Speech Input/Output via HTTP API
 * Integrates EarsEngine (STT) and VoiceEngine (TTS) with AgentCore
 *
 * Endpoints:
 * - POST /api/voice/listen - Capture and transcribe audio
 * - POST /api/voice/respond - Generate response with voice output
 * - POST /api/voice/transcribe - Transcribe uploaded audio file
 */

import express from 'express';
import { AgentCore } from '../../agent-core.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize AgentCore with voice capabilities
let agentInstance = null;

function getAgent() {
  if (!agentInstance) {
    agentInstance = new AgentCore({
      voiceOutput: true,
      reflectAloud: false,  // Don't spam console in API mode
      debug: false
    });
  }
  return agentInstance;
}

// Multer setup for audio file uploads
const audioDir = path.join(process.cwd(), 'brain', 'audio', 'uploads');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const uploadAudio = multer({
  storage: multer.diskStorage({
    destination: audioDir,
    filename: (req, file, cb) => {
      cb(null, `upload_${Date.now()}.wav`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = /\.(wav|mp3|m4a|ogg|flac)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'), false);
    }
  }
});

/**
 * POST /api/voice/listen
 * Capture audio from microphone and transcribe it
 *
 * Response: { success: true, transcription: "...", language: "de" }
 */
router.post('/listen', async (req, res) => {
  try {
    console.log('[VOICE-API] 🎤 Listen request received');

    const agent = getAgent();
    const audioResult = await agent.ears.startListening();

    if (!audioResult.success) {
      return res.status(400).json({
        success: false,
        error: audioResult.error
      });
    }

    res.json({
      success: true,
      transcription: audioResult.transcription,
      language: audioResult.language || 'de',
      duration: audioResult.duration,
      confidence: audioResult.confidence || 0.95
    });
  } catch (error) {
    console.error('[VOICE-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/respond
 * Generate response to text input with voice output
 *
 * Body: { text: "user message", voiceOutput: true }
 * Response: { success: true, response: "...", audioFile: "..." }
 */
router.post('/respond', async (req, res) => {
  try {
    const { text, voiceOutput = true } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text input required'
      });
    }

    console.log(`[VOICE-API] 🤖 Processing: "${text.substring(0, 50)}..."`);

    const agent = getAgent();

    // Override voice output setting for this request
    const originalVoiceOutput = agent.config.voiceOutput;
    agent.config.voiceOutput = voiceOutput;

    const response = await agent.generateResponse(text, {
      sessionId: 'api-voice',
      channel: 'voice-api'
    });

    agent.config.voiceOutput = originalVoiceOutput;

    res.json({
      success: true,
      input: text,
      response: response,
      voiceOutput: voiceOutput
    });
  } catch (error) {
    console.error('[VOICE-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/transcribe
 * Transcribe uploaded audio file
 *
 * Multipart form: { file: <audio.wav> }
 * Response: { success: true, transcription: "..." }
 */
router.post('/transcribe', uploadAudio.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file required'
      });
    }

    console.log(`[VOICE-API] 📝 Transcribing: ${req.file.filename}`);

    const agent = getAgent();
    const result = await agent.ears.transcribe(req.file.path);

    res.json({
      success: result.success,
      transcription: result.text || '',
      language: result.language || 'de',
      confidence: result.confidence || 0.95,
      file: req.file.filename
    });
  } catch (error) {
    console.error('[VOICE-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/listen-and-respond
 * Complete voice loop: Listen → Process → Respond
 *
 * Response: { success: true, input: "...", response: "..." }
 */
router.post('/listen-and-respond', async (req, res) => {
  try {
    console.log('[VOICE-API] 🔄 Complete voice loop initiated');

    const agent = getAgent();
    const result = await agent.listenAndRespond({
      sessionId: 'api-voice-loop',
      channel: 'voice-api'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[VOICE-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voice/status
 * Get voice system status
 */
router.get('/status', (req, res) => {
  try {
    const agent = getAgent();
    const status = agent.getStatus();

    res.json({
      success: true,
      agent: {
        name: status.identity.name,
        version: status.identity.version,
        capabilities: status.identity.capabilities
      },
      voice: status.voice,
      ears: status.ears
    });
  } catch (error) {
    console.error('[VOICE-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/speak
 * Speak text without processing (TTS only)
 *
 * Body: { text: "text to speak", language: "de" }
 */
router.post('/speak', async (req, res) => {
  try {
    const { text, language = 'de' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text required'
      });
    }

    console.log(`[VOICE-API] 🔊 Speaking: "${text.substring(0, 50)}..."`);

    const agent = getAgent();
    const result = await agent.voice.speak(text, { language });

    res.json({
      success: result.success,
      backend: result.backend,
      rate: result.rate,
      volume: result.volume
    });
  } catch (error) {
    console.error('[VOICE-API] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
