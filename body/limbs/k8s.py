import subprocess
import shlex

class K8sLimb:
    def __init__(self):
        self.connected = False
        self._check_connection()

    def _check_connection(self):
        try:
            # Check if kubectl is reachable
            subprocess.run(["kubectl", "version", "--client"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.connected = True
        except FileNotFoundError:
            self.connected = False
            print("⚠️ [K8sLimb] 'kubectl' not found in PATH.")
        except subprocess.CalledProcessError:
            self.connected = False
            print("⚠️ [K8sLimb] Failed to check kubectl version.")

    def get_cluster_health(self):
        """
        Executes real kubectl commands to get cluster status.
        """
        if not self.connected:
            return "K8s Disconnected (kubectl not found)"

        try:
            # Check Nodes
            # Command: kubectl get nodes --no-headers
            nodes_out = subprocess.check_output(["kubectl", "get", "nodes", "--no-headers"], text=True, stderr=subprocess.STDOUT)
            nodes_lines = nodes_out.strip().split('\n')
            total_nodes = len(nodes_lines)
            not_ready = [line for line in nodes_lines if "NotReady" in line]
            
            node_status = "OK"
            if not_ready:
                node_status = f"Warning ({len(not_ready)} NotReady)"

            # Check for bad pods
            # Command: kubectl get pods --all-namespaces --no-headers
            # We filter in Python to avoid complex grep chains across OS
            cmd = ["kubectl", "get", "pods", "-A", "--no-headers"]
            pods_out = subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)
            
            bad_pods = []
            for line in pods_out.split('\n'):
                if not line.strip(): continue
                parts = line.split()
                # Expected: Namespace Name Ready Status Restarts Age
                if len(parts) >= 5:
                    name = parts[1]
                    status = parts[3]
                    restarts = parts[4]
                    
                    if status not in ["Running", "Completed", "Succeeded"]:
                        bad_pods.append(f"{name}({status})")
                    elif int(restarts) > 5:
                        bad_pods.append(f"{name}(HighRestarts:{restarts})")

            status_str = f"Nodes: {total_nodes} ({node_status})"
            
            if bad_pods:
                # Limit output
                shown_pods = ", ".join(bad_pods[:3])
                if len(bad_pods) > 3:
                    shown_pods += f" (+{len(bad_pods)-3} more)"
                return f"{status_str} | Issues: {shown_pods}"
            
            return f"{status_str} | All Pods Normal"

        except subprocess.CalledProcessError as e:
            # This handles cases where kubectl returns non-zero exit code
            return f"K8s Error: {e.output.strip() if e.output else str(e)}"
        except Exception as e:
            return f"K8s Exception: {str(e)}"

    def get_service_health(self):
        """
        Checks for broken services (Endpoints = None or 0).
        Urgent: Tells the agent if valid endpoints exist.
        """
        if not self.connected:
            return "K8s Disconnected"

        try:
            # Get Services and their Endpoints
            # We use 'kubectl get endpoints -A'
            cmd = ["kubectl", "get", "endpoints", "-A", "--no-headers"]
            out = subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)
            
            bad_services = []
            for line in out.split('\n'):
                if not line.strip(): continue
                parts = line.split()
                # Namespace Name Endpoints Age
                if len(parts) >= 3:
                    ns = parts[0]
                    name = parts[1]
                    endpoints = parts[2]
                    
                    if endpoints == "<none>":
                        bad_services.append(f"{ns}/{name}")

            if bad_services:
                return f"CRITICAL: Services without endpoints: {', '.join(bad_services)}"
            
            return "Services: All Healthy"

        except Exception as e:
            return f"Service Check Error: {str(e)}"

    def execute_command(self, command):
        """
        Executes a real kubectl command with safety checks.
        """
        DANGER_KEYWORDS = ["delete", "scale", "apply", "edit", "patch"]
        
        # 1. Safety Check
        if any(keyword in command for keyword in DANGER_KEYWORDS):
             return f"⛔ SAFETY INTERVENTION: Command '{command}' blocked. Destructive action."

        if not self.connected:
            return "❌ Error: K8s Disconnected"

        # 2. Execution
        try:
            # Safe splitting of arguments
            args = shlex.split(command)
            full_cmd = ["kubectl"] + args
            
            result = subprocess.check_output(full_cmd, text=True, stderr=subprocess.STDOUT)
            return f"✅ Output:\n{result.strip()[:1000]}" # Truncate large output
            
        except subprocess.CalledProcessError as e:
            return f"❌ Execution Failed:\n{e.output.strip() if e.output else str(e)}"
        except Exception as e:
            return f"❌ Error: {str(e)}"
