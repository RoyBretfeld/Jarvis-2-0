import os
import ollama
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LLMProvider:
    def __init__(self):
        # Configuration
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.ollama_base_url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
        
        # Default Models
        self.model_local = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:14b")
        self.model_cloud = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        # Active State - Default to Groq if API key present, else Ollama
        if self.groq_api_key:
            self.active_provider = "groq"
            self.active_model = self.model_cloud
        else:
            self.active_provider = "ollama"
            self.active_model = self.model_local 

    def list_local_models(self):
        """Fetches list of available models from Ollama."""
        try:
            models_info = ollama.list()
            # ollama.list() returns a dict with 'models' list
            # Each model has a 'name' field
            return [m['name'] for m in models_info.get('models', [])]
        except Exception as e:
            print(f"⚠️ Ollama List Error: {e}")
            return ["qwen2.5-coder:14b", "llama3"] # Fallback

    def set_model(self, model_name):
        self.active_model = model_name
        return f"Model switched to: {model_name}"

    def set_groq_key(self, key):
        self.groq_api_key = key
        os.environ["GROQ_API_KEY"] = key # Update runtime for subsequent inits
        return "Groq Key Updated"

    def save_groq_key_to_env(self, key):
        """Persists the Groq API Key to .env"""
        self.groq_api_key = key
        os.environ["GROQ_API_KEY"] = key # Update runtime
        
        # Resolve path to .env (2 levels up from src/core)
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        env_path = os.path.abspath(env_path)
        
        # Read existing
        content = ""
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                content = f.read()
        
        # Update or Append
        new_line = f"GROQ_API_KEY={key}"
        if "GROQ_API_KEY=" in content:
            lines = content.split('\n')
            new_lines = []
            for line in lines:
                if line.strip().startswith("GROQ_API_KEY="):
                    new_lines.append(new_line)
                else:
                    new_lines.append(line)
            content = "\n".join(new_lines)
        else:
            if content and not content.endswith('\n'):
                content += "\n"
            content += new_line + "\n"
            
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        return "Key saved to .env"

    def switch_provider(self, provider_name):
        """Switches between 'ollama' and 'groq'."""
        provider_name = provider_name.lower().strip()
        
        if provider_name == "groq":
            if not self.groq_api_key:
                return "⚠️ Error: No GROQ_API_KEY found in .env"
            self.active_provider = "groq"
            self.active_model = self.model_cloud
        elif provider_name == "ollama":
            self.active_provider = "ollama"
            self.active_model = self.model_local
        else:
            return f"⚠️ Unknown provider: {provider_name}"
        
        return f"🔄 Provider switched to: {self.active_provider.upper()} ({self.active_model})"

    def generate(self, messages, temperature=0.7):
        """Executes the generation request via the active provider."""
        try:
            if self.active_provider == "groq":
                return self._call_groq(messages, temperature)
            else:
                return self._call_ollama(messages, temperature)
        except Exception as e:
            return f"⚠️ LLM Error ({self.active_provider}): {str(e)}"

    def _call_ollama(self, messages, temperature):
        # Use official Python Library
        response = ollama.chat(
            model=self.active_model,
            messages=messages,
            options={"temperature": temperature}
        )
        return response['message']['content']

    def _call_groq(self, messages, temperature):
        # Groq API Call via Requests
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.active_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048
        }
        
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        return response.json()['choices'][0]['message']['content']
