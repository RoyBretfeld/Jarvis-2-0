"""
Collector: Web Research & Knowledge Absorption for TAIA

Two modes:
1. ForgeCollector (original) - Trafilatura + Cortex
2. Collector (new) - DuckDuckGo search + Groq summarization
"""

import sys
import io
import os
import logging
from typing import List, Dict, Any
from datetime import datetime

# UTF-8 Force
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

import trafilatura
import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

# Setup Logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='[%(name)s] %(message)s')


class Collector:
    """
    Web Research Collector using DuckDuckGo + Groq

    Capabilities:
    - Search via DuckDuckGo (no API key)
    - Fetch & extract content
    - Summarize with Groq LLM
    """

    def __init__(self, groq_api_key: str = None):
        """Initialize with optional Groq API key"""
        self.groq_api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"
        self.ddgs = DDGS(timeout=10)
        logger.info("Collector: DuckDuckGo + Groq ready")

    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Search using DuckDuckGo"""
        try:
            logger.info(f"Searching: {query}")
            results = self.ddgs.text(query, max_results=max_results)
            return results
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []

    def fetch_content(self, url: str) -> str:
        """Fetch and extract text from URL"""
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')

            for script in soup(["script", "style"]):
                script.decompose()

            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)

            return text[:2000]
        except Exception as e:
            logger.error(f"Fetch error {url}: {e}")
            return ""

    def summarize_with_groq(self, content: str, query: str) -> str:
        """Summarize with Groq API"""
        if not self.groq_api_key:
            logger.warning("No Groq key - returning raw content")
            return content[:500]

        try:
            payload = {
                "model": self.groq_model,
                "messages": [{
                    "role": "user",
                    "content": f"Summarize for '{query}' in 2-3 sentences:\n\n{content}"
                }],
                "temperature": 0.5,
                "max_tokens": 300
            }

            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }

            response = requests.post(self.groq_url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            else:
                logger.error(f"Groq error: {response.status_code}")
                return content[:500]
        except Exception as e:
            logger.error(f"Summarize error: {e}")
            return content[:500]

    def search_and_summarize(
        self,
        query: str,
        max_results: int = 3,
        fetch_content: bool = True
    ) -> Dict[str, Any]:
        """Complete research: search → fetch → summarize"""
        logger.info(f"Researching: {query}")

        search_results = self.search(query, max_results=max_results)

        if not search_results:
            return {
                "query": query,
                "status": "ERROR",
                "message": "Keine Suchergebnisse gefunden",
                "results": []
            }

        results = []
        for result in search_results:
            item = {
                "title": result.get("title", ""),
                "url": result.get("href", ""),
                "snippet": result.get("body", ""),
                "summary": None
            }

            if fetch_content and result.get("href"):
                content = self.fetch_content(result.get("href"))
                if content:
                    summary = self.summarize_with_groq(content, query)
                    item["summary"] = summary

            results.append(item)

        logger.info(f"Research done: {len(results)} items")
        return {
            "query": query,
            "status": "SUCCESS",
            "count": len(results),
            "results": results
        }


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
