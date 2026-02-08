#!/usr/bin/env python3
"""
RB-Protocol Installation Wizard
Configures the framework based on application type (LLM-based or standard)
"""
import sys
import os
import io
import json
from pathlib import Path

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

CONFIG_FILE = "rb_config.json"

DEFAULT_CONFIG = {
    "protocol_version": "1.0",
    "application_type": None,
    "llm_enabled": False,
    "components": {
        "core": True,
        "modules": True,
        "cli": True,
        "skills": False,
        "skill_manager": False
    }
}

def print_header():
    print("\n" + "="*60)
    print("  RB-PROTOCOL INSTALLATION WIZARD")
    print("  Configuring your Antigravity Framework")
    print("="*60 + "\n")

def ask_application_type():
    """Ask user about the application type."""
    print("What type of application are you building?")
    print("  [1] Standard Application (Printer, DesktopControl, Utilities)")
    print("  [2] LLM-Based Application (JARVIS, AI Agent, Adaptive System)")
    print()

    while True:
        choice = input("Select [1] or [2]: ").strip()
        if choice in ["1", "2"]:
            return choice
        print("❌ Invalid choice. Please enter 1 or 2.")

def configure_components(app_type):
    """Configure which components to activate."""
    config = DEFAULT_CONFIG.copy()
    config["components"] = DEFAULT_CONFIG["components"].copy()

    if app_type == "1":
        # Standard Application
        config["application_type"] = "standard"
        config["llm_enabled"] = False
        config["components"]["skills"] = False
        config["components"]["skill_manager"] = False

        print("\n✅ STANDARD APPLICATION MODE")
        print("  Enabled: Core, Modules, CLI")
        print("  Disabled: Skills, SkillManager")

    else:
        # LLM-Based Application
        config["application_type"] = "llm_agent"
        config["llm_enabled"] = True
        config["components"]["skills"] = True
        config["components"]["skill_manager"] = True

        print("\n✅ LLM-AGENT MODE")
        print("  Enabled: Core, Modules, CLI, Skills, SkillManager")
        print("  Skills will be auto-discovered and loaded")

    return config

def show_component_summary(config):
    """Display what will be installed."""
    print("\n" + "-"*60)
    print("INSTALLATION SUMMARY")
    print("-"*60)
    print(f"Application Type: {config['application_type'].upper()}")
    print(f"LLM Features: {'✅ ENABLED' if config['llm_enabled'] else '❌ DISABLED'}")
    print()
    print("Components:")
    for component, enabled in config['components'].items():
        status = "✅" if enabled else "❌"
        print(f"  {status} {component.replace('_', ' ').title()}")
    print("-"*60 + "\n")

def save_config(config):
    """Save configuration to file."""
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    print(f"✅ Configuration saved to {CONFIG_FILE}")

def configure_skill_manager(config):
    """Configure SkillManager based on app type."""
    # The configuration-based approach in main.py handles this automatically
    # No file modification needed - the import is controlled by rb_config.json
    if not config["llm_enabled"]:
        print("ℹ️  Skills will be disabled based on rb_config.json (llm_enabled=false)")
    else:
        print("ℹ️  Skills will be auto-loaded based on rb_config.json (llm_enabled=true)")

def create_protocol_marker(config):
    """Create a marker file showing protocol configuration."""
    marker_file = Path("docs/_rb/INSTALLATION_MARKER.md")
    marker_file.parent.mkdir(parents=True, exist_ok=True)

    marker_content = f"""# RB-Protocol Installation Marker

**Date:** {__import__('datetime').datetime.now().isoformat()}

**Application Type:** {config['application_type'].upper()}

**LLM Enabled:** {'Yes' if config['llm_enabled'] else 'No'}

## Installed Components

- Core Framework: [ENABLED]
- Module System: [ENABLED]
- CLI Interface: [ENABLED]
- Skills System: {'[ENABLED]' if config['components']['skills'] else '[DISABLED]'}
- SkillManager: {'[ENABLED]' if config['components']['skill_manager'] else '[DISABLED]'}

## Notes

For standard applications (Printer, DesktopControl), the Skills system is disabled.
For LLM-based applications (JARVIS, Agents), the Skills system is fully active.

To change the configuration, re-run: `python setup_wizard.py`
"""

    marker_file.write_text(marker_content, encoding='utf-8')
    print(f"Installation marker created: {marker_file}")

def main():
    print_header()

    # Ask about application type
    app_type = ask_application_type()

    # Configure components
    config = configure_components(app_type)

    # Show summary
    show_component_summary(config)

    # Confirm
    confirm = input("Proceed with this configuration? [y/n]: ").strip().lower()
    if confirm != "y":
        print("❌ Installation cancelled.")
        sys.exit(1)

    # Save config
    save_config(config)

    # Configure SkillManager if needed
    configure_skill_manager(config)

    # Create marker
    create_protocol_marker(config)

    # Final message
    print()
    print("="*60)
    print("✅ RB-PROTOCOL INSTALLATION COMPLETE!")
    print("="*60)
    print()
    if config["llm_enabled"]:
        print("🧠 LLM Mode Active")
        print("   Run: python src/cli/main.py --skills")
        print("   to see available Skills")
    else:
        print("🔧 Standard Mode Active")
        print("   Run: python src/cli/main.py --scan")
        print("   to start system cleanup")
    print()

if __name__ == "__main__":
    main()
