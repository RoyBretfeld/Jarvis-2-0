import os
import datetime
from .cortex import Cortex

class ContextManager:
    def __init__(self, base_path):
        self.base_path = base_path
        self.soul_path = os.path.join(base_path, "brain", "SOUL.md")
        self.memory_path = os.path.join(base_path, "brain", "MEMORY.md")
        self.error_db_path = os.path.join(base_path, "brain", "ERROR_DB.md")
        self.brain_path = os.path.join(base_path, "brain") # Path for Cortex

        # Initialize Cortex (Hippocampus)
        self.cortex = Cortex(self.brain_path)
        self.error_db_path = os.path.join(self.brain_path, "ERROR_DB.md")

        # Ensure brain directory exists
        if not os.path.exists(self.brain_path):
            os.makedirs(self.brain_path)

    def close(self):
        """Close all resources"""
        if self.cortex:
            self.cortex.close()

    def __del__(self):
        """Cleanup on destruction"""
        self.close()

    def load_context(self, user_query=None):
        """Loads identity (Soul) and current memory."""
        context = {}
        
        # Load Soul (Identity)
        if os.path.exists(self.soul_path):
            with open(self.soul_path, "r", encoding="utf-8") as f:
                context["soul"] = f.read()
        else:
            context["soul"] = "Identity not found."

        # Load Memory (Long-term)
        if os.path.exists(self.memory_path):
            with open(self.memory_path, "r", encoding="utf-8") as f:
                context["memory"] = f.read()
        else:
            context["memory"] = "Memory empty."
            
        # Load Proprioception (K8s State)
        k8s_status_path = os.path.join(self.base_path, "body", "state", "K8S_STATUS.md")
        if os.path.exists(k8s_status_path):
            with open(k8s_status_path, "r", encoding="utf-8") as f:
                context["senses"] = f.read()
        else:
            context["senses"] = "Proprioception: No state available yet."

        # Recall Memories (The Cortex)
        if user_query and self.cortex.active:
            memories = self.cortex.recall(user_query)
            if memories:
                context["knowledge"] = "\n".join(memories)
            else:
                context["knowledge"] = "No relevant knowledge found."
        else:
            context["knowledge"] = ""

        return context

    def update_memory(self, new_entry):
        """Writes new information back to memory (Write-Back)."""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry_formatted = f"\n- [{timestamp}] {new_entry}"
        
        with open(self.memory_path, "a", encoding="utf-8") as f:
            f.write(entry_formatted)
            
        print(f"[Memory] Updated: {new_entry}")

    def log_error(self, error_type, description):
        """Logs errors to ERROR_DB.md for learning."""
        self._log_to_db(self.error_db_path, "ERROR", error_type, description)

    def log_warning(self, warning_type, description):
        """Logs warnings to MEMORY.md (Short-term context)."""
        # Warnings go to MEMORY for immediate awareness, but could also go to ERROR_DB if persistent
        self.update_memory(f"WARNING: [{warning_type}] {description}")

    def _log_to_db(self, file_path, log_type, title, description):
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"\n## [{timestamp}] {log_type}: {title}\n{description}\n"
        
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(entry)
            
        print(f"[{log_type}] Logged: {title} - {description}")
