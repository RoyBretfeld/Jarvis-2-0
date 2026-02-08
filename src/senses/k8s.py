import subprocess
import shlex

class K8sMotorics:
    def __init__(self):
        print("🖐️ [K8sMotorics] Online. Mode: Read-Only")

    def execute(self, tool_name):
        """Executes a named tool."""
        if tool_name == "cluster_status":
            return self._get_cluster_status()
        return "⚠️ Unknown Tool"

    def _run_cmd(self, cmd_str):
        try:
            args = shlex.split(cmd_str)
            result = subprocess.run(args, capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                return f"Error: {result.stderr.strip()}"
            return result.stdout.strip()
        except FileNotFoundError:
            return "Error: kubectl not found."
        except Exception as e:
            return f"Error: {str(e)}"

    def _get_cluster_status(self):
        """Checks nodes and pods."""
        nodes = self._run_cmd("kubectl get nodes")
        pods = self._run_cmd("kubectl get pods -A")
        
        # Simple analysis
        status_summary = f"""
=== CLUSTER STATUS REPORT ===
Nodes:
{nodes}

Pods (All Namespaces):
{pods}
=============================
"""
        return status_summary
