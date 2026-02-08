"""Tests for Configuration Loader"""

import pytest
import os
import json
from pathlib import Path

# Import config loader
from src.core.config.loader import ConfigLoader


class TestConfigLoader:
    """Test ConfigLoader functionality"""

    @pytest.fixture
    def project_root(self, tmp_path):
        """Create temporary project structure"""
        # Create directories
        config_dir = tmp_path / "config"
        config_dir.mkdir()

        # Create config files
        default_config = {
            "llm": {
                "providers": {
                    "groq": {
                        "api_key": "test_default_key",
                        "model": "default_model"
                    }
                },
                "default_provider": "groq"
            },
            "paths": {
                "body": "./body",
                "brain": "./brain"
            }
        }

        dev_config = {
            "llm": {
                "providers": {
                    "groq": {
                        "api_key": "test-api-key-placeholder",
                        "model": "llama-3.3-70b-versatile"
                    }
                }
            },
            "email": {
                "sender": "test@example.com",
                "password": "test-password-placeholder"
            }
        }

        # Write config files
        with open(config_dir / "default.json", 'w') as f:
            json.dump(default_config, f)

        with open(config_dir / "development.json", 'w') as f:
            json.dump(dev_config, f)

        # Create schema
        schema = {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "required": ["llm", "paths"],
            "properties": {
                "llm": {"type": "object"},
                "paths": {"type": "object"},
                "email": {"type": "object"}
            }
        }

        with open(config_dir / "schema.json", 'w') as f:
            json.dump(schema, f)

        # Create .env file
        env_content = """
# Test .env
GROQ_API_KEY=test-api-key-placeholder
RB_ALERT_SENDER=test@web.de
"""
        with open(tmp_path / ".env", 'w') as f:
            f.write(env_content)

        return tmp_path

    def test_load_default_config(self, project_root):
        """Test loading default configuration"""
        loader = ConfigLoader(project_root)
        config = loader.load(environment="development")

        assert "llm" in config
        assert "paths" in config
        assert config["llm"]["default_provider"] == "groq"

    def test_development_overrides_default(self, project_root):
        """Test that development config overrides default"""
        # Remove .env to test config file override only
        (project_root / ".env").unlink()

        loader = ConfigLoader(project_root)
        config = loader.load(environment="development")

        # Development should have Groq API key
        groq_key = config["llm"]["providers"]["groq"]["api_key"]
        assert groq_key == "test-api-key-placeholder"

    def test_env_file_is_loaded(self, project_root):
        """Test that .env file values are merged"""
        loader = ConfigLoader(project_root)
        config = loader.load(environment="development")

        # Email should come from .env
        assert config["email"]["sender"] == "test@web.de"

    def test_missing_environment_uses_default(self, project_root):
        """Test fallback to default when env config missing"""
        loader = ConfigLoader(project_root)
        config = loader.load(environment="nonexistent")

        # Should have default values
        assert "llm" in config
        assert "paths" in config

    def test_environment_variable_override(self, project_root, monkeypatch):
        """Test that environment variables override config"""
        monkeypatch.setenv('GROQ_API_KEY', 'test-api-key-placeholder')

        loader = ConfigLoader(project_root)
        config = loader.load(environment="development")

        # ENV var should override file
        assert config["llm"]["providers"]["groq"]["api_key"] == "test-api-key-placeholder"

    def test_get_provider(self, project_root):
        """Test get_provider helper"""
        loader = ConfigLoader(project_root)
        config = loader.load(environment="development")

        provider = loader.get_provider(config)
        assert provider == "groq"

    def test_get_provider_config(self, project_root):
        """Test get_provider_config helper"""
        loader = ConfigLoader(project_root)
        config = loader.load(environment="development")

        groq_config = loader.get_provider_config(config, "groq")
        assert "api_key" in groq_config
        assert "model" in groq_config


class TestConfigValidation:
    """Test Configuration Validation"""

    def test_validation_passes(self, tmp_path):
        """Test valid configuration passes validation"""
        from src.core.config.validator import ConfigValidator

        schema_path = tmp_path / "schema.json"
        schema = {
            "type": "object",
            "required": ["llm"],
            "properties": {
                "llm": {"type": "object"}
            }
        }

        with open(schema_path, 'w') as f:
            json.dump(schema, f)

        validator = ConfigValidator(schema_path)
        config = {"llm": {}}

        assert validator.validate(config) is True

    def test_validation_fails_missing_required(self, tmp_path):
        """Test validation fails when required field missing"""
        from src.core.config.validator import ConfigValidator

        schema_path = tmp_path / "schema.json"
        schema = {
            "type": "object",
            "required": ["llm", "paths"],
            "properties": {
                "llm": {"type": "object"},
                "paths": {"type": "object"}
            }
        }

        with open(schema_path, 'w') as f:
            json.dump(schema, f)

        validator = ConfigValidator(schema_path)
        config = {"llm": {}}  # Missing 'paths'

        with pytest.raises(ValueError):
            validator.validate(config)
