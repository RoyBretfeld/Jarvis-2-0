"""Configuration Validator with JSON Schema Support"""

import json
from pathlib import Path
from typing import Dict, Any


class ConfigValidator:
    """Validates configuration against JSON Schema"""

    def __init__(self, schema_path: Path):
        """
        Initialize validator with schema file

        Args:
            schema_path: Path to JSON schema file
        """
        if not schema_path.exists():
            raise FileNotFoundError(f"Schema file not found: {schema_path}")

        with open(schema_path, 'r', encoding='utf-8') as f:
            self.schema = json.load(f)

    def validate(self, config: Dict[str, Any]) -> bool:
        """
        Validate configuration against schema

        Args:
            config: Configuration dictionary

        Returns:
            True if valid

        Raises:
            ValueError: If configuration is invalid
        """
        try:
            import jsonschema
        except ImportError:
            # Fallback: basic validation without jsonschema
            return self._basic_validate(config)

        try:
            jsonschema.validate(config, self.schema)
            return True
        except jsonschema.ValidationError as e:
            raise ValueError(
                f"Configuration validation failed: {e.message}\n"
                f"Path: {' → '.join(str(p) for p in e.path) or 'root'}"
            )

    def _basic_validate(self, config: Dict[str, Any]) -> bool:
        """
        Basic validation without jsonschema library
        Checks required fields exist
        """
        required_fields = self.schema.get('required', [])

        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required field: {field}")

        # Check nested required fields for known structures
        properties = self.schema.get('properties', {})
        for prop_name, prop_schema in properties.items():
            if prop_name in config and isinstance(prop_schema, dict):
                prop_required = prop_schema.get('required', [])
                if isinstance(config[prop_name], dict):
                    for req_field in prop_required:
                        if req_field not in config[prop_name]:
                            raise ValueError(f"Missing required field: {prop_name}.{req_field}")

        return True
