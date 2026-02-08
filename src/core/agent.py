import os
import sys
import datetime
import ollama

# Adjust path to find body modules (until completely migrated)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from body.cortex import Cortex
from src.core.llm import LLMProvider
from src.senses.k8s import K8sMotorics

class ForgeAgent:
    def __init__(self, base_path, model="llama3"):
        self.base_path = base_path
        
        # 1. Initialize Brain (LLM)
        self.llm = LLMProvider()
        
        # 2. Define Paths
        self.brain_path = os.path.join(base_path, "brain")
        self.soul_path = os.path.join(self.brain_path, "SOUL.md")
        self.memory_path = os.path.join(self.brain_path, "MEMORY.md")
        self.chat_log_path = os.path.join(self.brain_path, "CHAT_LOG.md") # New Log
        self.error_db_path = os.path.join(self.brain_path, "ERROR_DB.md")
        self.k8s_status_path = os.path.join(base_path, "body", "state", "K8S_STATUS.md")

        # 3. Initialize Organs & Limbs (Now safe to init)
        self.cortex = Cortex(self.brain_path) # Hippocampus
        self.k8s = K8sMotorics() # Motorics
        
        # 3.1 Initialize Senses (Phase 7)
        from src.senses.collector import ForgeCollector
        self.collector = ForgeCollector(base_path)
        
        print(f"🤖 [ForgeAgent] Online. Model: {self.llm.active_model}")

    def _read_file(self, path, default=""):
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
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
        
        try:
            with open(self.chat_log_path, "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception as e:
            print(f"⚠️ [Log] Failed to write chat log: {e}")
