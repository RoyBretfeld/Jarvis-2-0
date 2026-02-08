"""
ForgeVoice - Text-to-Speech & Voice Output
Part of TAIA sensory system

Implements local, offline text-to-speech synthesis.
No cloud APIs - all processing on-device.
"""

import logging
import threading
from typing import Optional, Callable
from enum import Enum
from dataclasses import dataclass

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None


logger = logging.getLogger(__name__)


class VoiceState(Enum):
    """Voice output states"""
    IDLE = "idle"
    SPEAKING = "speaking"
    QUEUED = "queued"
    ERROR = "error"


@dataclass
class VoicePreference:
    """User voice preferences"""
    language: str = "de"  # German
    rate: int = 150  # Words per minute (default ~150)
    volume: float = 1.0  # 0.0 to 1.0
    voice_id: int = 0  # 0=default, 1=alternative, etc.


class ForgeVoice:
    """
    TAIA's voice system - generates speech output

    Features:
    - Local text-to-speech (pyttsx3)
    - Voice preference customization
    - Speech queue management
    - Multi-threaded speaking
    """

    # Default responses (German)
    DEFAULT_RESPONSES = {
        "wake": "Ich höre, Sir.",
        "status": "Status-Bericht wird erstellt.",
        "sentinel": "Sentinel-Check aktiv.",
        "sleep": "Ruhemodus aktiviert.",
        "wake_up": "Ich bin bereit.",
        "error": "Entschuldigung, ein Fehler ist aufgetreten.",
        "listening": "Bereit für Befehle.",
    }

    def __init__(
        self,
        preference: Optional[VoicePreference] = None,
        auto_play: bool = True,
        on_speech_start: Optional[Callable] = None,
        on_speech_end: Optional[Callable] = None,
    ):
        """
        Initialize ForgeVoice

        Args:
            preference: VoicePreference for customization
            auto_play: Automatically play speech
            on_speech_start: Callback when speech starts
            on_speech_end: Callback when speech ends
        """
        self.preference = preference or VoicePreference()
        self.auto_play = auto_play
        self.on_speech_start = on_speech_start
        self.on_speech_end = on_speech_end

        # State
        self.state = VoiceState.IDLE
        self.is_muted = False

        # TTS engine
        self.engine: Optional[pyttsx3.Engine] = None
        self.speech_thread: Optional[threading.Thread] = None

        # Metrics
        self.speeches_count = 0
        self.total_duration = 0.0

        self._initialize_engine()

    def _initialize_engine(self):
        """Initialize pyttsx3 engine"""
        if pyttsx3 is None:
            logger.warning("⚠ pyttsx3 not installed, voice output disabled")
            self.state = VoiceState.ERROR
            return

        try:
            self.engine = pyttsx3.init()

            # Configure voice
            self.engine.setProperty("rate", self.preference.rate)
            self.engine.setProperty("volume", self.preference.volume)

            # Set language/voice
            voices = self.engine.getProperty("voices")
            if len(voices) > self.preference.voice_id:
                self.engine.setProperty("voice", voices[self.preference.voice_id].id)

            logger.info(f"✓ Voice engine initialized: rate={self.preference.rate}, volume={self.preference.volume}")

        except Exception as e:
            logger.error(f"✗ Failed to initialize voice engine: {e}")
            self.state = VoiceState.ERROR

    def speak(
        self,
        text: str,
        is_async: bool = True,
        block_until_done: bool = False,
    ):
        """
        Speak the given text

        Args:
            text: Text to speak
            is_async: Run in background thread
            block_until_done: Wait for speech to complete
        """
        if self.engine is None:
            logger.warning("Voice engine not available")
            return

        if self.is_muted:
            logger.info(f"🔇 [MUTED] {text}")
            return

        logger.info(f"🗣️ Speaking: {text}")
        self.speeches_count += 1
        self.state = VoiceState.SPEAKING

        if self.on_speech_start:
            self.on_speech_start(text)

        try:
            self.engine.say(text)

            if is_async:
                self.speech_thread = threading.Thread(
                    target=self.engine.runAndWait,
                    daemon=True,
                )
                self.speech_thread.start()

                if block_until_done:
                    self.speech_thread.join()
            else:
                self.engine.runAndWait()

            self.state = VoiceState.IDLE

            if self.on_speech_end:
                self.on_speech_end(text)

        except Exception as e:
            logger.error(f"Speech error: {e}")
            self.state = VoiceState.ERROR

    def speak_response(
        self,
        response_key: str,
        custom_text: Optional[str] = None,
        is_async: bool = True,
    ):
        """
        Speak a predefined response

        Args:
            response_key: Key in DEFAULT_RESPONSES
            custom_text: Override default text
            is_async: Run in background
        """
        text = custom_text or self.DEFAULT_RESPONSES.get(response_key, "Verstanden.")
        self.speak(text, is_async=is_async)

    def queue_speech(self, text: str):
        """Add text to speech queue (experimental)"""
        if self.state == VoiceState.SPEAKING:
            self.state = VoiceState.QUEUED
            logger.info(f"📋 Queued: {text}")
        else:
            self.speak(text)

    def mute(self):
        """Mute voice output"""
        self.is_muted = True
        logger.info("🔇 Voice muted")

    def unmute(self):
        """Unmute voice output"""
        self.is_muted = False
        logger.info("🔊 Voice unmuted")

    def set_preferences(self, preference: VoicePreference):
        """Update voice preferences"""
        if self.engine is None:
            logger.warning("Voice engine not available")
            return

        self.preference = preference

        try:
            self.engine.setProperty("rate", preference.rate)
            self.engine.setProperty("volume", preference.volume)

            voices = self.engine.getProperty("voices")
            if len(voices) > preference.voice_id:
                self.engine.setProperty("voice", voices[preference.voice_id].id)

            logger.info(f"✓ Voice preferences updated: rate={preference.rate}, volume={preference.volume}")

        except Exception as e:
            logger.error(f"Failed to update preferences: {e}")

    def get_status(self) -> dict:
        """Get current voice system status"""
        return {
            "state": self.state.value,
            "is_muted": self.is_muted,
            "engine_loaded": self.engine is not None,
            "speeches": self.speeches_count,
            "preference": {
                "language": self.preference.language,
                "rate": self.preference.rate,
                "volume": self.preference.volume,
            },
        }

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        if self.engine:
            try:
                self.engine.stop()
            except Exception as e:
                logger.debug(f"Error stopping engine: {e}")
