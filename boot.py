import os
import sys

# Ensure we can import from body
sys.path.append(os.path.join(os.path.dirname(__file__), "body"))

from body.nervous_system import NervousSystem

def main():
    base_path = os.path.dirname(os.path.abspath(__file__))
    agent = NervousSystem(base_path)
    
    # 1. Wake up and load context
    agent.wake_up()
    
    # 2. Start Heartbeat (Background)
    agent.start_heartbeat()
    
    print("\n--- [System Online] ---")
    print("Commands: 'status', 'k8s <cmd>', 'exit'")
    
    # 3. Interactive Loop
    try:
        while True:
            user_input = input("\nUser > ").strip()
            
            if user_input.lower() == "exit":
                break
                
            if user_input:
                agent.process_input(user_input)
                
    except KeyboardInterrupt:
        print("\nForce Shutdown.")
    
    # 4. Shutdown
    agent.sleep()

if __name__ == "__main__":
    main()
