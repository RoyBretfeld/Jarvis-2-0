"""
ForgeEars - Speech Recognition & Wake-Word Detection
Part of TAIA sensory system

Implements local, offline speech-to-text with wake-word detection.
No cloud APIs - all processing on-device.
"""

import logging
import threading
import queue
from typing import Callable, Optional, List
from dataclasses import dataclass
from enum import Enum

import pyaudio
import numpy as np

try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

try:
    from openwakeword.model import Model as WakeWordModel
except ImportError:
    WakeWordModel = None


logger = logging.getLogger(__name__)


class AudioState(Enum):
    """Audio processing states"""
    IDLE = "idle"
    LISTENING = "listening"
    RECORDING = "recording"
    TRANSCRIBING = "transcribing"
    ERROR = "error"


@dataclass
class TranscriptionResult:
    """Result from speech transcription"""
    text: str
    confidence: float
    is_wake_word: bool = False
    language: str = "de"


class ForgeEars:
    """
    TAIA's hearing system - processes audio input and speech recognition

    Features:
    - Wake-word detection ("TAIA")
    - Local speech-to-text (Faster-Whisper)
    - Audio level monitoring
    - Streaming transcription
    """

    # Audio settings
    SAMPLE_RATE = 16000  # 16kHz for Whisper
    CHUNK_SIZE = 1024  # ~64ms chunks
    CHANNELS = 1  # Mono
    FORMAT = 'float32'

    # Wake-word settings
    WAKE_WORD = "TAIA"
    WAKE_WORD_THRESHOLD = 0.5

    # Hard-wired commands (reflexes)
    HARD_WIRED_COMMANDS = {
        "status-bericht": "get_system_status",
        "sentinel-check": "sentinel_check",
        "ruhemodus": "sleep",
        "aufwachen": "wake",
    }

    def __init__(
        self,
        model_size: str = "tiny",  # tiny, base, small, medium, large
        language: str = "de",
        enable_wake_word: bool = True,
        on_transcription: Optional[Callable] = None,
    ):
        """
        Initialize ForgeEars

        Args:
            model_size: Whisper model size (smaller = faster)
            language: Language code (de, en, etc.)
            enable_wake_word: Enable wake-word detection
            on_transcription: Callback for transcription results
        """
        self.model_size = model_size
        self.language = language
        self.enable_wake_word = enable_wake_word
        self.on_transcription = on_transcription

        # State
        self.state = AudioState.IDLE
        self.listening = False

        # Threading
        self.audio_thread: Optional[threading.Thread] = None
        self.audio_queue: queue.Queue = queue.Queue()
        self.stop_event = threading.Event()

        # Models
        self.whisper_model: Optional[WhisperModel] = None
        self.wake_word_model: Optional[WakeWordModel] = None

        # Audio interface
        self.audio: Optional[pyaudio.PyAudio] = None
        self.stream = None

        # Metrics
        self.transcriptions_count = 0
        self.wake_words_detected = 0

        self._initialize_models()

    def _initialize_models(self):
        """Load Whisper and wake-word models"""
        logger.info(f"Initializing ForgeEars with model={self.model_size}, lang={self.language}")

        try:
            if WhisperModel is not None:
                self.whisper_model = WhisperModel(
                    self.model_size,
                    device="cpu",  # Can use "cuda" if GPU available
                    language=self.language,
                )
                logger.info(f"✓ Whisper model loaded: {self.model_size}")
            else:
                logger.warning("⚠ faster-whisper not installed, transcription disabled")
        except Exception as e:
            logger.error(f"✗ Failed to load Whisper model: {e}")

        try:
            if self.enable_wake_word and WakeWordModel is not None:
                self.wake_word_model = WakeWordModel(
                    inference_framework="onnx",
                    model_path=self.WAKE_WORD.lower(),
                )
                logger.info(f"✓ Wake-word model loaded: {self.WAKE_WORD}")
            else:
                logger.warning("⚠ openWakeWord not installed, wake-word disabled")
        except Exception as e:
            logger.warning(f"⚠ Could not load wake-word model: {e}")

    def start_listening(self):
        """Start listening for audio input"""
        if self.listening:
            logger.warning("Already listening")
            return

        logger.info("Starting audio input...")
        self.listening = True
        self.state = AudioState.LISTENING
        self.stop_event.clear()

        # Start audio capture thread
        self.audio_thread = threading.Thread(
            target=self._audio_capture_loop,
            daemon=True,
        )
        self.audio_thread.start()
        logger.info("✓ Listening started")

    def stop_listening(self):
        """Stop listening for audio input"""
        if not self.listening:
            logger.warning("Not listening")
            return

        logger.info("Stopping audio input...")
        self.listening = False
        self.stop_event.set()

        if self.audio_thread:
            self.audio_thread.join(timeout=2)

        self._cleanup_audio()
        self.state = AudioState.IDLE
        logger.info("✓ Listening stopped")

    def _audio_capture_loop(self):
        """Main audio capture loop (runs in thread)"""
        try:
            self.audio = pyaudio.PyAudio()

            self.stream = self.audio.open(
                format=pyaudio.paFloat32,
                channels=self.CHANNELS,
                rate=self.SAMPLE_RATE,
                input=True,
                frames_per_buffer=self.CHUNK_SIZE,
            )

            logger.info("✓ Audio stream opened")

            audio_buffer = []
            wake_word_triggered = False

            while self.listening and not self.stop_event.is_set():
                try:
                    # Read audio chunk
                    chunk = self.stream.read(self.CHUNK_SIZE, exception_on_overflow=False)
                    audio_data = np.frombuffer(chunk, dtype=np.float32)

                    # Check audio level
                    level = np.abs(audio_data).mean()

                    # Wake-word detection
                    if self.enable_wake_word and not wake_word_triggered:
                        if self._check_wake_word(audio_data):
                            logger.info(f"🎤 Wake-word detected: {self.WAKE_WORD}")
                            self.wake_words_detected += 1
                            wake_word_triggered = True
                            audio_buffer = []  # Clear buffer, start fresh

                    # Buffer audio after wake-word
                    if wake_word_triggered:
                        audio_buffer.append(audio_data)

                        # Transcribe if we have enough audio (~2 seconds)
                        if len(audio_buffer) > (self.SAMPLE_RATE // self.CHUNK_SIZE) * 2:
                            self._transcribe_buffer(audio_buffer)
                            audio_buffer = []
                            wake_word_triggered = False

                except Exception as e:
                    logger.error(f"Error in audio capture: {e}")
                    self.state = AudioState.ERROR

        except Exception as e:
            logger.error(f"Failed to initialize audio stream: {e}")
            self.state = AudioState.ERROR

        finally:
            self._cleanup_audio()

    def _check_wake_word(self, audio_data: np.ndarray) -> bool:
        """Check if wake-word is detected in audio chunk"""
        if self.wake_word_model is None:
            return False

        try:
            # Convert audio to proper format for wake-word detection
            # This is simplified - real implementation would need proper windowing
            prediction = self.wake_word_model.predict(audio_data)

            # Check if prediction exceeds threshold
            if isinstance(prediction, dict):
                score = prediction.get(self.WAKE_WORD.lower(), 0)
                return score > self.WAKE_WORD_THRESHOLD

            return False
        except Exception as e:
            logger.debug(f"Wake-word check error: {e}")
            return False

    def _transcribe_buffer(self, audio_buffer: List[np.ndarray]):
        """Transcribe buffered audio data"""
        if self.whisper_model is None:
            logger.warning("Whisper model not available")
            return

        try:
            self.state = AudioState.TRANSCRIBING

            # Concatenate audio chunks
            audio_data = np.concatenate(audio_buffer)

            # Transcribe with Whisper
            segments, info = self.whisper_model.transcribe(
                audio_data,
                language=self.language,
                beam_size=5,
            )

            # Collect transcription
            full_text = " ".join([segment.text for segment in segments])
            confidence = info.duration  # Placeholder

            if full_text.strip():
                result = self._process_transcription(full_text, confidence)

                # Callback
                if self.on_transcription:
                    self.on_transcription(result)

                logger.info(f"📝 Transcribed: {result.text}")

            self.state = AudioState.LISTENING

        except Exception as e:
            logger.error(f"Transcription error: {e}")
            self.state = AudioState.ERROR

    def _process_transcription(self, text: str, confidence: float) -> TranscriptionResult:
        """Process transcribed text and check for hard-wired commands"""
        text_lower = text.lower()
        self.transcriptions_count += 1

        # Check for hard-wired commands (reflexes)
        command_name = None
        for keyword, cmd in self.HARD_WIRED_COMMANDS.items():
            if keyword in text_lower:
                command_name = cmd
                break

        result = TranscriptionResult(
            text=text,
            confidence=min(confidence, 1.0),
            is_wake_word=False,
            language=self.language,
        )

        return result

    def _cleanup_audio(self):
        """Clean up audio resources"""
        try:
            if self.stream:
                self.stream.stop_stream()
                self.stream.close()
            if self.audio:
                self.audio.terminate()
        except Exception as e:
            logger.error(f"Error cleaning up audio: {e}")

    def get_status(self) -> dict:
        """Get current audio system status"""
        return {
            "state": self.state.value,
            "listening": self.listening,
            "whisper_loaded": self.whisper_model is not None,
            "wake_word_loaded": self.wake_word_model is not None,
            "transcriptions": self.transcriptions_count,
            "wake_words_detected": self.wake_words_detected,
        }

    def __enter__(self):
        """Context manager entry"""
        self.start_listening()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.stop_listening()


# Example hard-wired command handlers
def get_system_status():
    """TAIA reflexive command: Status report"""
    return {
        "status": "operational",
        "cpu": "normal",
        "memory": "normal",
    }


def sentinel_check():
    """TAIA reflexive command: Security audit"""
    return {
        "security": "verified",
        "files": "intact",
    }


def sleep():
    """TAIA reflexive command: Sleep mode"""
    return {"mode": "sleeping"}


def wake():
    """TAIA reflexive command: Wake up"""
    return {"mode": "awake"}
