#!/usr/bin/env python3
"""
RB-Framework: DROP-IN INSTALLER (v3.0)
- Autonomous Setup
- Legacy Migration (00_BOOT -> 01_CONSTITUTION)
- Error-DB Integration
- Self-Destruction
"""
import os
import shutil
import sys
from pathlib import Path

def setup():
    root = Path.cwd()
    bootstrap_dir = root / "rb_bootstrap"
    payload_dir = bootstrap_dir / "payload"

    print("🚀 RB-Framework v3.0: Starting Installation...")

    if not payload_dir.exists():
        print(f"❌ Error: Payload directory not found at {payload_dir}")
        sys.exit(1)

    # 1. Copy Payload
    print("📦 Copying payload files...")
    for item in payload_dir.iterdir():
        dest = root / item.name
        if item.is_dir():
            if dest.exists():
                # Merge directories instead of just copying
                for subitem in item.rglob('*'):
                    rel_sub = subitem.relative_to(item)
                    sub_dest = dest / rel_sub
                    if subitem.is_dir():
                        sub_dest.mkdir(parents=True, exist_ok=True)
                    else:
                        sub_dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(subitem, sub_dest)
            else:
                shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)

    # 2. Legacy Migration
    legacy_boot = root / "docs" / "_rb" / "00_BOOT_PROTOCOL.md"
    constitution = root / "docs" / "_rb" / "01_THE_CONSTITUTION.md"
    
    if legacy_boot.exists():
        print("📜 Migrating legacy Boot Protocol to The Constitution...")
        legacy_boot.replace(constitution)
    
    # 3. Error-DB Integration (Simulation/Example)
    # Often, a global error DB path is stored in a template or env
    config_file = root / "docs" / "_rb" / "02_SYSTEM_FACTS.md"
    if config_file.exists():
        content = config_file.read_text(encoding='utf-8')
        if "{{GLOBAL_ERROR_DB_PATH}}" in content:
            # Mocking the discovery of a global error DB
            db_path = "../../SHARED_RESOURCES/GLOBAL_ERROR_DB.md"
            print(f"🔗 Linking Global Error-DB: {db_path}")
            new_content = content.replace("{{GLOBAL_ERROR_DB_PATH}}", db_path)
            config_file.write_text(new_content, encoding='utf-8')

    # 4. Success & Cleanup
    print("\n✅ RB-Framework v3.0 successfully installed.")
    print("   Note: New Constitution located in docs/_rb/01_THE_CONSTITUTION.md")
    
    # Self-Destruction
    try:
        print("💥 Self-destructing rb_bootstrap/ folder...")
        # We need to be careful with shutil.rmtree if the script is running inside that folder
        # But usually, it's run from the project root: python rb_bootstrap/installer.py
        shutil.rmtree(bootstrap_dir)
        print("✨ Done.")
    except Exception as e:
        print(f"⚠️  Self-destruction failed: {e}")
        print("   Please delete the 'rb_bootstrap/' folder manually.")

if __name__ == "__main__":
    setup()
