import subprocess
import time
import os
import sys

# Ensure we can import from body
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from body.limbs.k8s import K8sLimb
from body.nervous_system import NervousSystem

def run_kubectl(cmd):
    try:
        subprocess.run(cmd.split(), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except:
        return False

def live_fire_test():
    print("🔥 Starting Live Fire Exercise...")
    
    # 1. Setup
    print("[1/5] Creating Target: nginx-sabotage")
    run_kubectl("kubectl create deployment nginx-sabotage --image=nginx")
    run_kubectl("kubectl expose deployment nginx-sabotage --port=80")
    
    print("Waiting for startup...")
    time.sleep(10) # Give K8s time
    
    # 2. Verify Healthy
    limb = K8sLimb()
    health = limb.get_service_health()
    if "CRITICAL" in health and "nginx-sabotage" in health:
        print("❌ Setup Failed: Service not healthy initially.")
        return
    print(f"✅ Target Healthy: {health}")

    # 3. Sabotage
    print("[2/5] EXECUTE SABOTAGE: Scaling to 0")
    run_kubectl("kubectl scale deployment nginx-sabotage --replicas=0")
    
    print("Waiting for Proprioception (15s)...")
    time.sleep(15) 

    # 4. Verify Perception (Simulation of Nervous System Loop)
    # We manually trigger the check to avoid waiting for the full minute loop in this script
    print("[3/5] Triggering Nervous System Scan")
    agent = NervousSystem(os.path.dirname(os.path.abspath(__file__)))
    # Manually run the check logic commonly found in _heartbeat_loop
    svc_health = agent.k8s.get_service_health()
    
    print(f"[4/5] Agent Perception: {svc_health}")
    
    if "CRITICAL" in svc_health and "nginx-sabotage" in svc_health:
        print("✅ SUCCESS: Agent felt the pain (Service Down detected).")
    else:
        print(f"❌ FAILURE: Agent missed the issue. Status: {svc_health}")

    # 5. Cleanup
    print("[5/5] Cleanup")
    run_kubectl("kubectl delete service nginx-sabotage")
    run_kubectl("kubectl delete deployment nginx-sabotage")
    
    print("🔥 Exercise Complete.")

if __name__ == "__main__":
    live_fire_test()
