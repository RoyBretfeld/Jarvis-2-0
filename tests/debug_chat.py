import os
import sys

# Add project root to path
# The tests folder is The Forge/tests, so we need to go up one level to The Forge
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.core.agent import ForgeAgent

def main():
    print("🔬 [Debug] Initializing ForgeAgent...")
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    
    # Initialize with default llama3
    agent = ForgeAgent(base_path, model="llama3")
    
    print("\n--- CLI CHAT (Type 'exit' to quit) ---")
    while True:
        user_input = input("\nYou > ")
        if user_input.lower() in ["exit", "quit"]:
            break
            
        print("🤖 Thinking...")
        response = agent.chat(user_input)
        print(f"TAIA > {response}")

if __name__ == "__main__":
    main()
