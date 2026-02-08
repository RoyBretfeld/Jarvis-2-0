"""Configuration Loader with .env Support and JSON Config"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional

from .validator import ConfigValidator


class ConfigLoader:
    """
    Loads and manages configuration from multiple sources:
    1. .env file (legacy support)
    2. config/development.json (primary)
    3. Environment variables (overrides)
    """

    def __init__(self, project_root: Optional[Path] = None):
        """
        Initialize config loader

        Args:
            project_root: Root directory of the project (auto-detected if None)
        """
        self.project_root = project_root or self._detect_project_root()
        self.config_dir = self.project_root / "config"
        self.env_file = self.project_root / ".env"

        # Try to load schema
        schema_path = self.config_dir / "schema.json"
        self.validator = ConfigValidator(schema_path) if schema_path.exists() else None

    def _detect_project_root(self) -> Path:
        """Auto-detect project root by finding config/ directory"""
        current = Path(__file__).parent.parent.parent.parent  # src/core/config/loader.py -> project root
        return current

    def load(self, environment: str = "development") -> Dict[str, Any]:
        """
        Load configuration with priority:
        1. config/{environment}.json
        2. config/default.json (fallback)
        3. .env file (legacy)
        4. Environment variables (overrides)

        Args:
            environment: Environment name (development, production, etc.)

        Returns:
            Loaded configuration dictionary

        Raises:
            ValueError: If configuration is invalid
        """
        # Start with default config
        config = self._load_default_config()

        # Load environment-specific config
        env_config_path = self.config_dir / f"{environment}.json"
        if env_config_path.exists():
            env_config = self._load_json(env_config_path)
            config = self._merge_configs(config, env_config)

        # Load .env file (legacy support)
        if self.env_file.exists():
            env_vars = self._parse_env_file(self.env_file)
            config = self._merge_env_vars(config, env_vars)

        # Override with actual environment variables
        config = self._apply_environment_overrides(config)

        # Normalize types (convert string ports to integers, etc.)
        config = self._normalize_types(config)

        # Validate configuration
        if self.validator:
            self.validator.validate(config)

        return config

    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration"""
        default_path = self.config_dir / "default.json"
        if not default_path.exists():
            return {}
        return self._load_json(default_path)

    def _load_json(self, path: Path) -> Dict[str, Any]:
        """Load JSON file with error handling"""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in {path}: {e}")
        except Exception as e:
            raise ValueError(f"Failed to load {path}: {e}")

    def _parse_env_file(self, path: Path) -> Dict[str, str]:
        """Parse .env file into dictionary"""
        env_vars = {}
        try:
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()

                    # Skip comments and empty lines
                    if not line or line.startswith('#'):
                        continue

                    # Parse KEY=VALUE
                    if '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()

                        # Remove quotes if present
                        if value.startswith('"') and value.endswith('"'):
                            value = value[1:-1]
                        elif value.startswith("'") and value.endswith("'"):
                            value = value[1:-1]

                        env_vars[key] = value
        except Exception as e:
            print(f"Warning: Failed to parse .env file: {e}")

        return env_vars

    def _merge_configs(self, base: Dict, override: Dict) -> Dict:
        """Deep merge two configuration dictionaries"""
        result = base.copy()

        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._merge_configs(result[key], value)
            else:
                result[key] = value

        return result

    def _merge_env_vars(self, config: Dict[str, Any], env_vars: Dict[str, str]) -> Dict[str, Any]:
        """Merge environment variables into config"""
        # Map .env variables to config paths
        env_mapping = {
            'GROQ_API_KEY': ['llm', 'providers', 'groq', 'api_key'],
            'GROQ_MODEL': ['llm', 'providers', 'groq', 'model'],
            'OLLAMA_URL': ['llm', 'providers', 'ollama', 'url'],
            'OLLAMA_MODEL': ['llm', 'providers', 'ollama', 'model'],
            'RB_ALERT_SENDER': ['email', 'sender'],
            'RB_ALERT_RECEIVER': ['email', 'receiver'],
            'RB_ALERT_PW': ['email', 'password'],
            'RB_SMTP_SERVER': ['email', 'smtp_server'],
            'RB_SMTP_PORT': ['email', 'smtp_port'],
            'PORT': ['server', 'port'],
        }

        for env_key, config_path in env_mapping.items():
            if env_key in env_vars:
                self._set_nested_value(config, config_path, env_vars[env_key])

        return config

    def _apply_environment_overrides(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Override config with environment variables"""
        if os.getenv('GROQ_API_KEY'):
            self._set_nested_value(
                config,
                ['llm', 'providers', 'groq', 'api_key'],
                os.getenv('GROQ_API_KEY')
            )

        if os.getenv('GROQ_MODEL'):
            self._set_nested_value(
                config,
                ['llm', 'providers', 'groq', 'model'],
                os.getenv('GROQ_MODEL')
            )

        if os.getenv('OLLAMA_URL'):
            self._set_nested_value(
                config,
                ['llm', 'providers', 'ollama', 'url'],
                os.getenv('OLLAMA_URL')
            )

        if os.getenv('OLLAMA_MODEL'):
            self._set_nested_value(
                config,
                ['llm', 'providers', 'ollama', 'model'],
                os.getenv('OLLAMA_MODEL')
            )

        return config

    def _normalize_types(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize configuration types
        Convert string ports to integers, etc.
        """
        # Convert SMTP port to integer
        if 'email' in config and 'smtp_port' in config['email']:
            try:
                config['email']['smtp_port'] = int(config['email']['smtp_port'])
            except (ValueError, TypeError):
                pass

        # Convert server port to integer
        if 'server' in config and 'port' in config['server']:
            try:
                config['server']['port'] = int(config['server']['port'])
            except (ValueError, TypeError):
                pass

        return config

    @staticmethod
    def _set_nested_value(config: Dict, path: list, value: Any) -> None:
        """Set value in nested dictionary using path"""
        current = config

        # Navigate to parent
        for key in path[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]

        # Set final value
        current[path[-1]] = value

    def get_llm_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Extract LLM configuration"""
        return config.get('llm', {})

    def get_provider(self, config: Dict[str, Any]) -> str:
        """Get active LLM provider"""
        return config.get('llm', {}).get('default_provider', 'groq')

    def get_provider_config(self, config: Dict[str, Any], provider: str) -> Dict[str, Any]:
        """Get configuration for specific provider"""
        return config.get('llm', {}).get('providers', {}).get(provider, {})
