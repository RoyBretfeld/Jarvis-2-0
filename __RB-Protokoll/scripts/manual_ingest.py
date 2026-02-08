import sys
import os

# Add project root to path
# Script is in __RB-Protokoll/scripts, so we need to go up two levels
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from src.core.agent import ForgeAgent

def main():
    if len(sys.argv) < 2:
        print("Usage: python manual_ingest.py <url>")
        return

    url = sys.argv[1]
    if not url.startswith("http"):
        url = "https://" + url

    print(f"🕷️ Ingesting: {url}")
    
    agent = ForgeAgent(os.getcwd(), model="llama3")
    
    # Trigger collector
    try:
        result = agent.collector.absorb_url(url, agent.cortex)
        print(f"\nRESULT:\n{result}")
    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == "__main__":
    main()
