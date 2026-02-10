import os
import chromadb
import ollama
import glob
import gc
import time

class Cortex:
    def __init__(self, brain_path):
        self.brain_path = brain_path
        self.chroma_path = os.path.join(brain_path, "chroma_db")
        self.knowledge_path = os.path.join(brain_path, "knowledge")
        self.collection_name = "long_term_memory"
        self.client = None
        self.collection = None

        # Initialize ChromaDB
        try:
            self.client = chromadb.PersistentClient(path=self.chroma_path)
            self.collection = self.client.get_or_create_collection(name=self.collection_name)
            self.active = True
            print("🧠 [Cortex] Hippocampus active.")
        except Exception as e:
            print(f"⚠️ [Cortex] Memory Init Failed: {e}")
            self.active = False

    def close(self):
        """Close ChromaDB connection gracefully"""
        if self.client is not None:
            try:
                # Force garbage collection to release SQLite locks
                self.client = None
                self.collection = None
                gc.collect()
                time.sleep(0.1)  # Allow filesystem to release lock
            except Exception as e:
                print(f"⚠️ [Cortex] Close Failed: {e}")

    def __del__(self):
        """Ensure cleanup on garbage collection"""
        self.close()

    def embed_text(self, text):
        """Generates embedding via Ollama."""
        try:
            response = ollama.embeddings(model="nomic-embed-text", prompt=text)
            return response["embedding"]
        except Exception as e:
            print(f"⚠️ [Cortex] Embedding Failed (Ollama down?): {e}")
            return None

    def memorize(self, text, metadata=None):
        """Stores a memory."""
        if not self.active: return
        
        embedding = self.embed_text(text)
        if not embedding: return

        # Simple ID generation
        import uuid
        mem_id = str(uuid.uuid4())
        
        self.collection.add(
            documents=[text],
            embeddings=[embedding],
            metadatas=[metadata or {}],
            ids=[mem_id]
        )
        # print(f"🧠 [Cortex] Memorized: {text[:30]}...")

    def recall(self, query, n_results=3):
        """Retrieves relevant memories."""
        if not self.active: return []

        embedding = self.embed_text(query)
        if not embedding: return []

        try:
            results = self.collection.query(
                query_embeddings=[embedding],
                n_results=n_results
            )
            # Flatten results
            memories = []
            if results["documents"]:
                for i, doc in enumerate(results["documents"][0]):
                    meta = results["metadatas"][0][i]
                    source = meta.get("source", "unknown")
                    memories.append(f"[{source}] {doc}")
            return memories
        except Exception as e:
            print(f"⚠️ [Cortex] Recall Failed: {e}")
            return []

    def absorb(self, file_path):
        """Ingests a file into memory."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Simple Chunking (by paragraphs or length)
            # For now, splitting by double newlines
            chunks = content.split("\n\n")
            filename = os.path.basename(file_path)
            
            count = 0
            for chunk in chunks:
                if len(chunk.strip()) < 10: continue
                self.memorize(chunk, {"source": filename, "type": "knowledge"})
                count += 1
            
            print(f"🧠 [Cortex] Absorbed {count} chunks from {filename}")
        except Exception as e:
            print(f"⚠️ [Cortex] Failed to absorb {file_path}: {e}")

    def absorb_knowledge_base(self):
        """Scans brain/knowledge/ and absorbs all md/txt files."""
        if not self.active: return
        
        types = ("*.md", "*.txt")
        files = []
        for t in types:
            files.extend(glob.glob(os.path.join(self.knowledge_path, t)))
            
        if not files:
            print("🧠 [Cortex] Knowledge Base empty.")
            return

        print(f"🧠 [Cortex] Example: Absorbing {len(files)} docs...")
        # Note: In a real system, we should check if already ingested to avoid dupes.
        # For this prototype, we just re-absorb or append.
        # Ideally, check hash.
        # For now, simplest implementation: just do it.
        for f in files:
            self.absorb(f)
