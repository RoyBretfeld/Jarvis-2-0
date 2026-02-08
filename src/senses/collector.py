import trafilatura
import os
from datetime import datetime

class ForgeCollector:
    def __init__(self, base_path):
        self.base_path = base_path
        # Allow reusing existing Cortex structure
        self.kb_path = os.path.join(base_path, "brain", "knowledge")
        if not os.path.exists(self.kb_path):
            os.makedirs(self.kb_path)

    def absorb_url(self, url, cortex):
        """Fetches content and feeds it to Cortex."""
        try:
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                return f"⚠️ Fehler: Konnte {url} nicht erreichen."
            
            content = trafilatura.extract(downloaded)
            if not content:
                return f"⚠️ Fehler: Kein Text auf {url} gefunden."

            # 1. Backup to Markdown (Knowledge Base)
            filename = f"web_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            filepath = os.path.join(self.kb_path, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(f"# Source: {url}\n\n{content}")

            # 2. Feed to Cortex (Vector DB)
            metadata = {"source": url, "type": "web_knowledge", "date": datetime.now().isoformat()}
            cortex.memorize(content, metadata)
            
            return f"✅ Wissen absorbiert: {url}\n(Backup: `{filename}`)"
        except Exception as e:
            return f"⚠️ Kritischer Fehler: {e}"
