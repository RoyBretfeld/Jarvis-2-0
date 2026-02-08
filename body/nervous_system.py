import time
import threading
import shutil
import os
from .context_manager import ContextManager
from .limbs.k8s import K8sLimb

class NervousSystem:
    def __init__(self, base_path):
        self.ctx = ContextManager(base_path)
        self.k8s = K8sLimb()
        self.heartbeat_active = False
        self.heartbeat_interval = 60 # Default 60s
        self.state_dir = os.path.join(base_path, "body", "state")
        
        if not os.path.exists(self.state_dir):
            os.makedirs(self.state_dir)

    def wake_up(self):
        print("⚡ System Initializing...")
        
        # Absorb Knowledge
        self.ctx.cortex.absorb_knowledge_base()
        
        context = self.ctx.load_context()
        print(f"\n--- [SOUL] ---\n{context['soul'][:100]}...\n")
        
        # Inject K8s Status from Proprioception file if available
        # (This is handled by ContextManager, but we print it here for CLI)
        if "senses" in context:
            print(f"--- [PROPRIOCEPTION] ---\n{context['senses']}\n")
        
        return context

    def start_heartbeat(self):
        """Starts the autonomous background loop."""
        if self.heartbeat_active:
            return
            
        self.heartbeat_active = True
        thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        thread.start()
        print("💓 Proprioception Loop started (Background Thread).")

    def _heartbeat_loop(self):
        print("💓 Heartbeat/Proprioception Active")
        k8s_status_file = os.path.join(self.state_dir, "K8S_STATUS.md")
        
        while self.heartbeat_active:
            try:
                # 1. Proprioception: Scan K8s & Write State
                # Focus on Services first (Critical)
                svc_health = self.k8s.get_service_health()
                pod_health = self.k8s.get_cluster_health()
                
                # Combine into status Markdown
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
                status_content = f"""# K8S_STATUS.md
**Last Scan:** {timestamp}

## Services (Vital)
{svc_health}

## Pods/Nodes (General)
{pod_health}
"""
                with open(k8s_status_file, "w", encoding="utf-8") as f:
                    f.write(status_content)
                
                # 2. Check System Health (Heartbeat Rules)
                total, used, free = shutil.disk_usage("/")
                disk_percent = (used / total) * 100
                
                if disk_percent > 90:
                    self.ctx.log_warning("System Health", f"Disk usage critical: {disk_percent:.1f}%")
                
                # Check for Critical Service Failures in Logic
                if "CRITICAL" in svc_health:
                    self.ctx.log_warning("K8s Service Alert", svc_health)
                    
                # Sleep interval
                time.sleep(self.heartbeat_interval)
                
            except Exception as e:
                self.ctx.log_error("Proprioception Failure", str(e))
                time.sleep(60)

    def process_input(self, user_input):
        print(f"User: {user_input}")
        
        # 1. Proprioception / Reflexes
        if "kubectl" in user_input.lower() or "k8s" in user_input.lower():
            cmd = user_input.replace("kubectl", "").strip()
            response = self.k8s.execute_command(cmd)
            self.ctx.update_memory(f"K8s Action: {cmd} -> {response}")
            return response

        # 2. Recall & Cognition
        context = self.ctx.load_context(user_query=user_input)
        if context.get("knowledge"):
             print(f"🧠 [Hippocampus] Recalled:\n{context['knowledge']}\n")

        response = f"Processed: {user_input}" 
        print(f"Agent: {response}")
        
        if "learn" in user_input.lower():
            self.ctx.update_memory(f"Learned from user: {user_input}")

        return response

    def sleep(self):
        print("💤 System shutting down.")
        self.heartbeat_active = False
