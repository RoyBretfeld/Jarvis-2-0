import os
import sys
import datetime
import logging
import ollama
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Adjust path to find body modules (until completely migrated)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from body.cortex import Cortex
from src.core.llm import LLMProvider
from src.core.jarvis import PriorityEvaluator, DecisionRouter, Priority
from src.core.sentinel import SentinelGatekeeper
from src.senses.k8s import K8sMotorics
from src.senses.ears import ForgeEars
from src.senses.voice import ForgeVoice, VoicePreference
from src.core.skills import SkillMatrix
from src.services.memory.compression import CompressionService
from src.services.memory.archive import ArchiveService
from src.services.memory.scheduler import MemoryScheduler

class ForgeAgent:
    def __init__(self, base_path, model="llama3"):
        self.base_path = Path(base_path)

        # 1. Initialize Brain (LLM)
        self.llm = LLMProvider()

        # 2. Define Paths
        self.brain_path = self.base_path / "brain"
        self.soul_path = self.brain_path / "SOUL.md"
        self.memory_path = self.brain_path / "MEMORY.md"
        self.chat_log_path = self.brain_path / "CHAT_LOG.md"
        self.error_db_path = self.brain_path / "ERROR_DB.md"
        self.k8s_status_path = self.base_path / "body" / "state" / "K8S_STATUS.md"

        # 3. Initialize JARVIS Priority Engine
        feedback_file = self.base_path / "body" / "state" / "jarvis_feedback.json"
        self.priority_evaluator = PriorityEvaluator(feedback_file=feedback_file)
        self.decision_router = DecisionRouter(
            on_suggest=self._on_suggestion,
            on_critical=self._on_critical,
        )

        # 4. Initialize Security (Sentinel)
        self.sentinel = SentinelGatekeeper(self.base_path)

        # 5. Initialize Organs & Limbs
        self.cortex = Cortex(str(self.brain_path))  # Hippocampus
        self.k8s = K8sMotorics()  # Motorics

        # 5.1 Initialize Skill Matrix (Output Autonomy)
        self.skills = SkillMatrix(self.base_path, sentinel=self.sentinel)

        # 5.2 Initialize Phase D Memory Tiering (Archive + Compression + Scheduler)
        body_path = self.base_path / "body"
        archive_path = self.brain_path / "archives"

        self.compression_service = CompressionService(body_path)
        self.archive_service = ArchiveService(body_path, archive_path)
        self.memory_scheduler = MemoryScheduler(
            body_path=body_path,
            archive_path=archive_path,
            compression_service=self.compression_service,
            archive_service=self.archive_service,
            jarvis_callback=self._on_memory_action
        )

        # Start scheduler if configured (autonomous at Priority 3-4)
        try:
            if self._get_config_value("memory.tiering.enable_auto_compression", True):
                self.memory_scheduler.start()
                print(f"⏰ [MemoryScheduler] Automatic tiering enabled (7/14/21 days)")
        except Exception as e:
            print(f"⚠️ [MemoryScheduler] Could not start: {e}")

        # 6. Initialize Senses
        from src.senses.collector import ForgeCollector
        self.collector = ForgeCollector(str(self.base_path))

        # 6.1 Initialize Audio Senses (Ears + Voice)
        try:
            self.ears = ForgeEars(
                model_size="tiny",
                language="de",
                on_transcription=self._on_transcription,
            )
        except Exception as e:
            print(f"⚠️ Warning: Could not initialize ears: {e}")
            self.ears = None

        try:
            self.voice = ForgeVoice(
                preference=VoicePreference(language="de", rate=150),
                auto_play=True,
            )
        except Exception as e:
            print(f"⚠️ Warning: Could not initialize voice: {e}")
            self.voice = None

        print(f"🤖 [ForgeAgent] Online. Model: {self.llm.active_model}")
        print(f"🧠 [JARVIS] Priority Engine loaded")
        print(f"🛡️ [Sentinel] Security gatekeeper active")
        if self.ears:
            print(f"👂 [Ears] Audio input ready")
        if self.voice:
            print(f"🗣️ [Voice] Speech output ready")

    def _read_file(self, path, default=""):
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        return default

    def _get_config_value(self, key: str, default=None):
        """
        Get configuration value from rb_config.json

        Args:
            key: Dot-separated key path (e.g., "memory.tiering.enable_auto_compression")
            default: Default value if not found

        Returns:
            Config value or default
        """
        try:
            import json
            config_file = self.base_path / "rb_config.json"
            if config_file.exists():
                with open(config_file, "r") as f:
                    config = json.load(f)

                # Navigate nested keys
                value = config
                for part in key.split("."):
                    value = value.get(part, {})

                return value if value else default
        except Exception:
            pass

        return default

    def build_context(self, user_input):
        """Assembles the System Prompt from Body & Soul."""
        
        # 1. Identity & Memory
        soul = self._read_file(self.soul_path, "Identity: Unknown")
        memory = self._read_file(self.memory_path, "Memory: Empty")
        
        # 2. Proprioception (Body State)
        k8s_status = self._read_file(self.k8s_status_path, "K8s Status: Unknown")

        # 3. Knowledge Recall (RAG)
        recalled_knowledge = ""
        if self.cortex.active:
            memories = self.cortex.recall(user_input)
            if memories:
                recalled_knowledge = "\n".join(memories)

        # 4. Construct Prompt
        system_prompt = f"""
{soul}

=== LANGZEITGEDÄCHTNIS (MEMORY) ===
{memory}

=== KÖRPER STATUS (K8S) ===
{k8s_status}

=== WISSEN (CORTEX) ===
{recalled_knowledge if recalled_knowledge else "Kein spezifisches Wissen abgerufen."}

=== INSTRUKTIONEN (WICHTIG) ===
- Du bist TAIA.
- Antworte IMMER und AUSSCHLIESSLICH auf DEUTSCH.
- Nutze dein Gedächtnis und Wissen.
- Wenn du etwas Neues lernst, beginne eine Zeile mit 'MEM_UPDATE: <Fakt>'.
- Fasse dich kurz und präzise.
"""
        return system_prompt

    def chat(self, user_input, history=None, image_description=None):
        """The main thinking loop with Memory and Senses."""
        
        # 0. Check for Special Commands
        if user_input.strip().lower().startswith("/switch"):
            parts = user_input.split(" ")
            target = parts[1] if len(parts) > 1 else "ollama"
            return self.llm.switch_provider(target)
            
        # 0.5 Check for Learning Trigger (Phase 7)
        if user_input.strip().lower().startswith("/learn "):
            url = user_input.strip().split(" ", 1)[1]
            print(f"🧠 [Agent] Learning from: {url}")
            return self.collector.absorb_url(url, self.cortex)
            
        # 0.1 Check for Tool Triggers (Motorics)
        tool_output = ""
        if "cluster" in user_input.lower() and ("status" in user_input.lower() or "wie" in user_input.lower()):
            tool_output = self.k8s.execute("cluster_status")
            print(f"🖐️ [Motorics] Executed cluster_status")

        # 1. Build System Context (The Soul & Knowledge)
        system_prompt = self.build_context(user_input)
        
        # Inject Sense Data into System Prompt
        if image_description:
            system_prompt += f"\n\n=== VISUAL INPUT (EYES) ===\n{image_description}"
            
        if tool_output:
             system_prompt += f"\n\n=== TOOL OUTPUT (HANDS) ===\n{tool_output}"
        
        # 2. Construct Full Message Chain (Cognition)
        messages = [{'role': 'system', 'content': system_prompt}]
        
        # Append Short-Term History (if provided)
        if history:
            # We assume history is a list of {'role': 'user'/'assistant', 'content': ...}
            # Filter out UI-specific keys if necessary, strictly keeping role/content
            clean_history = [{'role': m['role'], 'content': m['content']} for m in history]
            messages.extend(clean_history)
            
        # Append Current Input
        messages.append({'role': 'user', 'content': user_input})
        
        # 3. Inference (LLM Provider)
        reply = self.llm.generate(messages)

        # 4. Memory Parsing (Write-Back)
        self._process_memory_updates(reply)
        
        # 5. Full Logging (Persistence)
        self._log_interaction(user_input, reply)
        
        return reply

    def _process_memory_updates(self, text):
        """Scans output for MEM_UPDATE: and saves it."""
        lines = text.split('\n')
        for line in lines:
            if "MEM_UPDATE:" in line:
                # Extract the memory
                parts = line.split("MEM_UPDATE:", 1)
                if len(parts) > 1:
                    memory_content = parts[1].strip()
                    self._write_to_memory(memory_content)

    def _write_to_memory(self, content):
        """Appends to MEMORY.md."""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"\n- [{timestamp}] {content}"
        
        with open(self.memory_path, "a", encoding="utf-8") as f:
            f.write(entry)
        print(f"💾 [Memory] Saved: {content}")

    def _log_interaction(self, user, agent):
        """Logs the full conversation to CHAT_LOG.md."""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"\n## [{timestamp}]\n**User:** {user}\n**Agent:** {agent}\n"

        # Check security before writing
        access_level, reason = self.sentinel.check_file_access(str(self.chat_log_path), "write")
        if not self.sentinel(str(self.chat_log_path), "write"):
            print(f"🚫 [Security] Cannot write to {self.chat_log_path}: {reason}")
            return

        try:
            with open(self.chat_log_path, "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception as e:
            print(f"⚠️ [Log] Failed to write chat log: {e}")

    # ============ JARVIS CALLBACKS ============

    def _on_suggestion(self, priority: Priority):
        """
        Called when JARVIS has a suggestion (priority 5-9)
        """
        msg = f"💡 Suggestion: {priority.task} ({priority.level}/10)"

        if self.voice:
            # Speak the suggestion
            self.voice.speak(f"Vorschlag: {priority.task}. Bestätigung erforderlich.", is_async=True)

        print(msg)
        # In full UI, this would trigger a dialog box

    def _on_critical(self, priority: Priority):
        """
        Called when JARVIS detects critical issue (priority 10)
        """
        msg = f"🚨 CRITICAL: {priority.task} ({priority.level}/10)"

        if self.voice:
            # Speak immediately with urgency
            self.voice.speak(f"Warnung! {priority.task}. Sofortige Aktion erforderlich!", is_async=False)

        print(msg)
        # In full UI, this would show a modal dialog

    def _on_memory_action(self, priority: int, action: str):
        """
        Called by MemoryScheduler for autonomous actions (Priority 3-4)

        Integrates with JARVIS for priority-based execution
        """
        if priority <= 4:
            # Silent housekeeping (autonomous, logged)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"[MemoryScheduler] Autonomous action (Priority {priority}): {action}")
        elif priority == 6:
            # Threshold warning (suggest, wait for approval)
            print(f"💡 [Memory] {action} (Priority {priority})")
            if self.voice:
                self.voice.speak(f"Speicher-Warnung: {action}", is_async=True)
        elif priority >= 8:
            # Critical (immediate interrupt)
            print(f"🚨 [Memory] {action} (Priority {priority})")
            if self.voice:
                self.voice.speak(f"Kritische Speicher-Warnung: {action}", is_async=False)

    # ============ SENSES CALLBACKS ============

    def _on_transcription(self, result):
        """
        Called when ears.py completes transcription

        Routes transcribed text to chat or hard-wired command handler
        """
        text = result.text.lower()

        print(f"🎤 Transcribed: {result.text}")

        # Check for hard-wired commands first
        if "status" in text or "status-bericht" in text:
            # Reflexive command: direct execution
            status = self._get_system_status()
            print(f"✓ Status: {status}")

            if self.voice:
                self.voice.speak("System läuft normal.", is_async=True)

            return

        elif "sentinel" in text:
            # Reflexive command: security audit
            print("🔍 Running Sentinel check...")
            audit = self.sentinel.get_audit_report()

            if self.voice:
                self.voice.speak("Sentinel-Überprüfung abgeschlossen.", is_async=True)

            return

        elif "ruhemodus" in text or "sleep" in text:
            # Reflexive command: stop listening
            if self.ears:
                self.ears.stop_listening()

            if self.voice:
                self.voice.speak("Ruhemodus aktiviert.", is_async=True)

            return

        elif "aufwachen" in text or "wake" in text:
            # Reflexive command: start listening
            if self.ears:
                self.ears.start_listening()

            if self.voice:
                self.voice.speak("Aufgewacht und bereit.", is_async=True)

            return

        # Otherwise: route to LLM
        reply = self.chat(result.text)

        # Speak the response
        if self.voice:
            # Take first 300 chars of response for TTS
            response_text = reply[:300] if len(reply) > 300 else reply
            self.voice.speak(response_text, is_async=True)

    def _get_system_status(self) -> dict:
        """Get system status for reflexive command"""
        return {
            "status": "operational",
            "ears": self.ears.get_status() if self.ears else "not_initialized",
            "voice": self.voice.get_status() if self.voice else "not_initialized",
            "llm": self.llm.active_model,
            "memory": self.cortex.active,
        }

    # ============ LISTEN/SPEAK INTERFACE ============

    def listen(self):
        """Start listening for voice input"""
        if not self.ears:
            print("⚠️ Ears not initialized")
            return

        print("👂 Starting to listen for 'TAIA'...")

        if self.voice:
            self.voice.speak("Ich bin bereit. Sagen Sie TAIA gefolgt von Ihrem Befehl.", is_async=True)

        self.ears.start_listening()

    def stop_listening(self):
        """Stop listening for voice input"""
        if not self.ears:
            return

        print("🔇 Stopped listening")

        if self.voice:
            self.voice.speak("Höre nicht mehr zu.", is_async=True)

        self.ears.stop_listening()

    def force_write(self, filepath: str, content: str) -> dict:
        """
        Generic force write for body/ directory

        TAIA's physical write interface for autonomous knowledge storage.
        Creates missing subdirectories automatically.

        Args:
            filepath: Relative path from base (e.g., 'body/skills/alexa.md')
            content: Content to write

        Returns:
            {status, path, size, message}
        """
        try:
            # 1. Build full path
            full_path = self.base_path / filepath
            parent_dir = full_path.parent

            # 2. Create parent directories if missing
            parent_dir.mkdir(parents=True, exist_ok=True)

            # 3. Verify Sentinel allows write
            sentinel_check = self.sentinel.can_write(str(full_path))
            if not sentinel_check:
                error_msg = f"Sentinel denied write: {filepath}"
                logger.error(error_msg)
                return {
                    "status": "DENIED",
                    "path": str(full_path),
                    "message": error_msg
                }

            # 4. Write with UTF-8
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)

            # 5. Verify write success
            if full_path.exists() and full_path.stat().st_size > 0:
                file_size = full_path.stat().st_size
                logger.info(f"✅ Written: {filepath} ({file_size} bytes)")

                return {
                    "status": "SUCCESS",
                    "path": str(full_path),
                    "size": file_size,
                    "message": f"Successfully written {file_size} bytes"
                }
            else:
                return {
                    "status": "ERROR",
                    "path": str(full_path),
                    "message": "Write verification failed (size check)"
                }

        except Exception as e:
            error_msg = f"Force write failed: {e}"
            logger.error(error_msg)
            return {
                "status": "ERROR",
                "message": error_msg
            }

    def force_write_skill(self, skill_name: str, content: str) -> dict:
        """
        Force write skill documentation to body/skills/

        This is TAIA's physical write interface for skill autonomy.
        Bypasses standard I/O to ensure file write success.

        Args:
            skill_name: Skill filename (e.g., 'alexa' for alexa.md)
            content: Markdown content to write

        Returns:
            {status, path, size, message}
        """
        try:
            # 1. Build path (body/skills/[skill].md)
            skills_dir = self.base_path / "body" / "skills"
            skills_dir.mkdir(parents=True, exist_ok=True)

            filepath = skills_dir / f"{skill_name}.md"

            # 2. Verify Sentinel allows body/skills/ writes
            sentinel_check = self.sentinel.can_write(str(filepath))
            if not sentinel_check:
                print(f"⚠️ Sentinel denied write to {filepath}")
                return {
                    "status": "DENIED",
                    "path": str(filepath),
                    "message": "Sentinel security check failed"
                }

            # 3. Write with UTF-8 (double-check encoding)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)

            # 4. Verify write success
            if filepath.exists():
                file_size = filepath.stat().st_size
                print(f"✅ Skill written: {filepath} ({file_size} bytes)")

                # 5. Voice confirmation
                if self.voice:
                    self.voice.speak(
                        f"Sir, die Dokumentation für {skill_name} wurde erfolgreich gespeichert.",
                        is_async=True
                    )

                return {
                    "status": "SUCCESS",
                    "path": str(filepath),
                    "size": file_size,
                    "message": f"Skill '{skill_name}' written successfully"
                }
            else:
                return {
                    "status": "ERROR",
                    "path": str(filepath),
                    "message": "File write verification failed"
                }

        except Exception as e:
            error_msg = f"Force write failed: {e}"
            print(f"❌ {error_msg}")

            if self.voice:
                self.voice.speak("Fehler beim Schreiben der Skill-Datei.", is_async=True)

            return {
                "status": "ERROR",
                "message": error_msg
            }

    def speak(self, text: str):
        """Speak text using voice"""
        if not self.voice:
            print(f"💬 {text}")
            return

        self.voice.speak(text, is_async=True)
