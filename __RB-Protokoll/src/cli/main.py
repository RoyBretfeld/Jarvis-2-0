import argparse
import sys
import os
import io
import json
from pathlib import Path

# Force UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# Ensure src is in python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

# Load configuration and conditionally import SkillManager
config_file = Path(os.path.dirname(__file__)) / ".." / ".." / "rb_config.json"
llm_enabled = False
if config_file.exists():
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
            llm_enabled = config.get('llm_enabled', False)
    except Exception:
        llm_enabled = False

# Only import SkillManager if LLM features are enabled
SkillManager = None
if llm_enabled:
    from src.core.skill_manager import SkillManager

def main():
    parser = argparse.ArgumentParser(description="Antigravity CLI")
    parser.add_argument("--scan", action="store_true", help="Run system scan (dry-run)")
    parser.add_argument("--clean", action="store_true", help="Execute cleanup")
    parser.add_argument("--skills", action="store_true", help="List available skills")

    args = parser.parse_args()

    print("🚀 Antigravity v0.1.0")
    
    if args.skills:
        if not llm_enabled:
            print("❌ Skills feature is disabled for this application type.")
            print("   To enable Skills, re-run: python setup_wizard.py")
            print("   and select 'LLM-Based Application'")
            return
        manager = SkillManager()
        skills = manager.discover_skills()
        print(f"\n🧠 Found {len(skills)} Skills:")
        for skill in skills:
            print(f"   - {skill.name}: {skill.description}")
        return

    if args.scan:
        print("Scanners not fully implemented yet.")
        # TODO: Load cleaner modules
    
    if args.clean:
        if not args.scan:
            print("⚠️  Safety: Please run --scan first!")
            return
        print("Cleaners not fully implemented yet.")

if __name__ == "__main__":
    main()
